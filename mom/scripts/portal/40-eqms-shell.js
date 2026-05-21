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
  // MODULE REGISTRY — 31 EQMS modules (world-class surface v4.1)
  // =========================================================================
  var MODULES = [
    // --- Quality Events ---
    { id: 'quality-tower',        label: { vi: 'Tháp chất lượng', en: 'Quality Control Tower' },          icon: '\u{1F3EF}', group: 'quality-events', archetype: 'control-tower' },
    { id: 'complaints',           label: { vi: 'Khiếu nại khách hàng', en: 'Customer Complaints' },       icon: '\u{1F4E2}', group: 'quality-events', archetype: 'exception-hub' },
    { id: 'deviations',           label: { vi: 'Sự kiện chất lượng', en: 'Deviations / Quality Events' }, icon: '\u26A0\uFE0F', group: 'quality-events', archetype: 'exception-hub' },
    { id: 'ncr',                  label: { vi: 'NCR / MRB', en: 'NCR / MRB' },                            icon: '\u{1F6AB}', group: 'quality-events', archetype: 'exception-hub' },
    { id: 'capa',                 label: { vi: 'CAPA', en: 'CAPA' },                                      icon: '\u{1F527}', group: 'quality-events', archetype: 'evidence-workspace' },
    { id: 'concessions',          label: { vi: 'Nhượng bộ / Dùng nguyên trạng', en: 'Concessions' },      icon: '\u{1F4DD}', group: 'quality-events', archetype: 'approval-queue' },
    { id: 'lessons-learned',      label: { vi: 'Bài học kinh nghiệm', en: 'Lessons Learned' },            icon: '\u{1F4A1}', group: 'quality-events', archetype: 'list-report' },
    { id: 'customer-satisfaction',label: { vi: 'Đo lường KH hài lòng', en: 'Customer Satisfaction' },    icon: '\u2B50', group: 'quality-events', archetype: 'analytical-list' },

    // --- Documents & Change ---
    { id: 'doc-overview',         label: { vi: 'Sơ đồ Tài liệu',     en: 'Document Visual Map' },         icon: '\u{1F5FA}️', group: 'docs-change', archetype: 'analytical-list' },
    { id: 'change-control',       label: { vi: 'Kiểm soát thay đổi', en: 'Change Control' },              icon: '\u{1F504}', group: 'docs-change', archetype: 'evidence-workspace' },
    { id: 'engineering-change',   label: { vi: 'Thay đổi kỹ thuật', en: 'Engineering Change' },           icon: '\u2699\uFE0F', group: 'docs-change', archetype: 'evidence-workspace' },
    { id: 'documents',            label: { vi: 'Kiểm soát tài liệu', en: 'Document Control' },            icon: '\u{1F4C4}', group: 'docs-change', archetype: 'evidence-workspace' },
    { id: 'training',             label: { vi: 'Đào tạo & Năng lực', en: 'Training & Competency' },       icon: '\u{1F393}', group: 'docs-change', archetype: 'list-report' },
    { id: 'audits',               label: { vi: 'Quản lý đánh giá', en: 'Audit Management' },              icon: '\u{1F50D}', group: 'docs-change', archetype: 'list-report' },

    // --- Supplier Quality ---
    { id: 'suppliers',            label: { vi: 'Mạng lưới nhà cung cấp', en: 'Supplier Quality Network' },icon: '\u{1F310}', group: 'supplier', archetype: 'analytical-list' },
    { id: 'supplier-audits',      label: { vi: 'Đánh giá NCC & SCAR', en: 'Supplier Audits & SCAR' },     icon: '\u{1F4CB}', group: 'supplier', archetype: 'evidence-workspace' },
    { id: 'aml',                  label: { vi: 'Danh sách NCC được duyệt', en: 'Approved Supplier List' }, icon: '\u2705', group: 'supplier', archetype: 'analytical-list' },

    // --- Risk & Compliance ---
    { id: 'risks',                label: { vi: 'Quản lý rủi ro & FMEA', en: 'Risk Management & FMEA' },   icon: '\u{1F6E1}\uFE0F', group: 'risk-compliance', archetype: 'analytical-list' },
    { id: 'calibration',          label: { vi: 'Hiệu chuẩn / MSA', en: 'Calibration / MSA' },             icon: '\u{1F4CF}', group: 'risk-compliance', archetype: 'evidence-workspace' },
    { id: 'lab-investigations',   label: { vi: 'OOS/OOT / Điều tra', en: 'Lab Investigations' },           icon: '\u{1F52C}', group: 'risk-compliance', archetype: 'exception-hub' },

    // --- Inspection & Testing ---
    { id: 'inspection',           label: { vi: 'IQC / Kiểm tra', en: 'IQC / In-Process Inspection' },     icon: '\u{1F4CB}', group: 'inspection', archetype: 'operator-execution' },
    { id: 'spc',                  label: { vi: 'SPC Analytics', en: 'SPC Analytics' },                     icon: '\u{1F4C8}', group: 'inspection', archetype: 'analytical-list' },
    { id: 'batch-release',        label: { vi: 'Giải phóng lô', en: 'Batch Release' },                    icon: '\u{1F4E6}', group: 'inspection', archetype: 'approval-queue' },
    { id: 'sampling-plans',       label: { vi: 'Kế hoạch lấy mẫu AQL', en: 'Sampling Plans (AQL)' },      icon: '\u{1F4CA}', group: 'inspection', archetype: 'list-report' },

    // --- Advanced ---
    { id: 'validation',           label: { vi: 'Quản lý xác nhận', en: 'Validation Management' },         icon: '\u{1F9EA}', group: 'advanced', archetype: 'evidence-workspace' },
    { id: 'field-actions',        label: { vi: 'Hành động thực địa', en: 'Field Actions / Recall' },       icon: '\u{1F6A8}', group: 'advanced', archetype: 'exception-hub' },
    { id: 'genealogy',            label: { vi: 'Truy xuất nguồn gốc', en: 'Genealogy / Traceability' },    icon: '\u{1F333}', group: 'advanced', archetype: 'object-page' },
    { id: 'quality-agreements',   label: { vi: 'Thoả thuận chất lượng', en: 'Quality Agreements' },        icon: '\u{1F91D}', group: 'advanced', archetype: 'evidence-workspace' },
    { id: 'warranty',             label: { vi: 'Bảo hành & Khiếu kiện', en: 'Warranty & Claims' },         icon: '\u{1F6E0}\uFE0F', group: 'advanced', archetype: 'exception-hub' },

    // --- Pre-Launch Quality (IATF 16949 / AS9100D / AS9145) ---
    { id: 'apqp-ppap',            label: { vi: 'APQP / PPAP', en: 'APQP / PPAP' },                        icon: '\u{1F3AF}', group: 'pre-launch', archetype: 'evidence-workspace' },
    { id: 'special-characteristics', label: { vi: 'Đặc tính đặc biệt (SC/CC)', en: 'Special Characteristics' }, icon: '\u{1F536}', group: 'pre-launch', archetype: 'analytical-list' },
    { id: 'fai',                  label: { vi: 'Kiểm tra lần đầu (FAI)', en: 'First Article Inspection' }, icon: '\u{1F195}', group: 'pre-launch', archetype: 'evidence-workspace' }
  ];

  var GROUPS = [
    { id: 'quality-events',   label: { vi: 'Sự kiện chất lượng', en: 'Quality Events' } },
    { id: 'docs-change',      label: { vi: 'Tài liệu & Thay đổi', en: 'Documents & Change' } },
    { id: 'supplier',         label: { vi: 'Chất lượng nhà cung cấp', en: 'Supplier Quality' } },
    { id: 'risk-compliance',  label: { vi: 'Rủi ro & Tuân thủ', en: 'Risk & Compliance' } },
    { id: 'inspection',       label: { vi: 'Kiểm tra & Thử nghiệm', en: 'Inspection & Testing' } },
    { id: 'advanced',         label: { vi: 'Nâng cao', en: 'Advanced' } },
    { id: 'pre-launch',       label: { vi: 'Tiền sản xuất (IATF 16949)', en: 'Pre-Launch Quality (IATF 16949)' } }
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

  var ENVELOPE_KEYS = {
    ok: true, success: true, server_time: true, _httpStatus: true,
    error: true, detail: true, message: true,
    total: true, offset: true, limit: true, has_more: true
  };
  var RESPONSE_RECORD_KEYS = [
    'complaint', 'deviation', 'ncr_record', 'capa_record', 'change_control',
    'engineering_change', 'document', 'training_record', 'curriculum',
    'audit', 'supplier_profile', 'supplier_audit', 'scar', 'risk',
    'fmea_record', 'calibration_record', 'msa_record', 'investigation',
    'batch_release', 'project', 'validation_project', 'field_action',
    'thread', 'quality_agreement',
    'concession', 'lesson_learned', 'csat_survey', 'aml_entry',
    'sampling_plan', 'warranty_claim', 'special_char', 'fai_report',
    'apqp_project', 'iqc_summary'
  ];
  var RESPONSE_LIST_KEYS = [
    'complaints', 'deviations', 'ncr_records', 'capa_records',
    'change_controls', 'engineering_changes', 'documents',
    'training_records', 'curricula', 'matrix', 'audits', 'audit_events',
    'checklist_items', 'findings', 'supplier_profiles', 'scorecards',
    'qualifications', 'quality_agreements', 'supplier_audits', 'scars',
    'risks', 'fmea_records', 'calibration_records', 'msa_records',
    'lab_investigations', 'batch_releases', 'validation_projects',
    'requirements', 'protocols', 'executions', 'field_actions',
    'genealogy_threads', 'records', 'items', 'comments', 'attachments',
    'relationships', 'signatures', 'upstream_chain', 'downstream_chain',
    'concessions', 'lessons_learned', 'csat_surveys', 'aml_entries',
    'sampling_plans', 'warranty_claims', 'special_chars', 'fai_reports',
    'apqp_projects', 'iqc_records'
  ];

  function isPlainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
  }

  function queryStringFromPayload(payload) {
    if (!payload) return '';
    return Object.keys(payload).map(function(k) {
      var value = payload[k];
      if (value == null) value = '';
      if (typeof value === 'object') value = JSON.stringify(value);
      return encodeURIComponent(k) + '=' + encodeURIComponent(value);
    }).join('&');
  }

  function normalizeApiResponse(data, status) {
    if (!isPlainObject(data)) return data;
    if (status != null && data._httpStatus == null) data._httpStatus = status;

    if (data.success == null && data.ok != null) data.success = !!data.ok;
    if (data.ok == null && data.success != null) data.ok = !!data.success;
    if (!data.message && (data.detail || data.error)) data.message = data.detail || data.error;

    if (data.data == null) {
      var payloadKeys = Object.keys(data).filter(function(k) { return !ENVELOPE_KEYS[k]; });
      var listKey = RESPONSE_LIST_KEYS.find(function(k) { return Array.isArray(data[k]); });
      var recordKey = RESPONSE_RECORD_KEYS.find(function(k) { return isPlainObject(data[k]); });

      if (data.nodes || data.edges) {
        data.data = {
          nodes: data.nodes || [],
          edges: data.edges || [],
          root_id: data.root_id || data.rootId || null
        };
      } else if (listKey) {
        data.data = data[listKey];
      } else if (recordKey) {
        var record = Object.assign({}, data[recordKey]);
        payloadKeys.forEach(function(k) {
          if (k !== recordKey && record[k] == null) record[k] = data[k];
        });
        data.data = record;
      } else if (data.metrics && isPlainObject(data.metrics)) {
        data.data = data.metrics;
      } else if (payloadKeys.length === 1) {
        data.data = data[payloadKeys[0]];
      }
    }

    if (data.total == null && data.pagination && data.pagination.total != null) {
      data.total = data.pagination.total;
    }
    if (data.pagination == null && data.total != null) {
      data.pagination = {
        total: Number(data.total) || 0,
        offset: Number(data.offset) || 0,
        limit: Number(data.limit) || 0,
        has_more: !!data.has_more
      };
    }
    return data;
  }

  // ── GET cache (Sprint 7E) ─────────────────────────────────────────────────
  // Caches GET responses for 60 seconds to prevent redundant API calls when
  // multiple modules request the same data (e.g. reference lists, metrics).
  var _getCache = {};        // cacheKey -> { data, expiresAt }
  var GET_CACHE_TTL_MS = 60 * 1000;

  function _getCacheKey(action, payload) {
    return action + '|' + (payload ? JSON.stringify(payload) : '');
  }

  function _getCached(action, payload) {
    var key = _getCacheKey(action, payload);
    var entry = _getCache[key];
    if (entry && Date.now() < entry.expiresAt) return entry.data;
    if (entry) delete _getCache[key];
    return null;
  }

  function _setCached(action, payload, data) {
    _getCache[_getCacheKey(action, payload)] = { data: data, expiresAt: Date.now() + GET_CACHE_TTL_MS };
  }

  function invalidateGetCache(actionPrefix) {
    if (!actionPrefix) { _getCache = {}; return; }
    Object.keys(_getCache).forEach(function(k) {
      if (k.indexOf(actionPrefix) === 0) delete _getCache[k];
    });
  }

  // API wrapper
  function apiCall(action, payload, method, timeout) {
    method = method || 'POST';
    timeout = timeout || 30000; // 30s default timeout
    var url = 'api/index.php?action=' + encodeURIComponent(action);

    // Sprint 7E: serve GET requests from 60-second in-memory cache
    if (method === 'GET') {
      var cached = _getCached(action, payload);
      if (cached !== null) {
        return Promise.resolve(cached);
      }
    }

    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, timeout);
    var opts = { method: method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', signal: controller.signal };
    if (window.csrfToken) opts.headers['X-CSRF-Token'] = window.csrfToken;
    if (method !== 'GET' && payload) opts.body = JSON.stringify(payload);
    if (method === 'GET' && payload) {
      var qs = queryStringFromPayload(payload);
      if (qs) url += '&' + qs;
    }
    return fetch(url, opts).then(function(r) {
      clearTimeout(timer);
      return r.json().then(function(data) {
        var normalized = normalizeApiResponse(data, r.status);
        if (method === 'GET' && normalized && normalized.ok !== false) {
          _setCached(action, payload, normalized);
        }
        return normalized;
      });
    }).catch(function(err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        return { ok: false, success: false, error: 'timeout', message: 'Request timed out after ' + (timeout/1000) + 's' };
      }
      throw err;
    });
  }

  // DB-backed reference/dropdown hydration. No local option fallback is used.
  var referenceCache = {};
  var referencePending = {};
  var referenceSearchTimers = {};
  var referenceHydrationScheduled = false;
  var referenceControlSeq = 0;

  function normalizeReferenceKey(key) {
    return String(key || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  }

  function referenceCacheKey(key, search) {
    key = normalizeReferenceKey(key);
    search = String(search || '').trim().toLowerCase();
    return search ? key + '::' + search : key;
  }

  function inferReferenceKey(field) {
    field = field || {};
    if (field.reference === false || field.ref === false || field.lookup === false) return '';
    var explicit = normalizeReferenceKey(field.reference || field.ref || field.lookup || '');
    if (explicit) return explicit;

    var key = normalizeReferenceKey(field.key || field.name || '');
    if (!key) return '';

    var exact = {
      customer: 'customers',
      customer_id: 'customers',
      customer_name: 'customers',
      customer_destination: 'customers',
      customer_site: 'customer_sites',
      customer_site_id: 'customer_sites',
      party: 'parties',
      party_code: 'parties',
      party_id: 'party_records',
      partner: 'parties',
      partner_name: 'parties',
      partner_id: 'party_records',
      supplier: 'suppliers',
      supplier_id: 'suppliers',
      vendor: 'suppliers',
      vendor_id: 'suppliers',
      department: 'departments',
      department_id: 'departments',
      department_code: 'departments',
      dept: 'departments',
      dept_id: 'departments',
      dept_code: 'departments',
      owner_department: 'departments',
      owning_department: 'departments',
      responsible_department: 'departments',
      auditee_dept: 'departments',
      role: 'roles',
      role_code: 'roles',
      owner_role: 'roles',
      reviewer_role: 'roles',
      site: 'sites',
      site_id: 'sites',
      area: 'areas',
      area_id: 'areas',
      plant: 'plants',
      plant_id: 'plants',
      lot: 'lots',
      lot_number: 'lots',
      affected_lot_number: 'lots',
      source_lot: 'lots',
      source_lot_number: 'lots',
      origin_lot: 'lots',
      origin_lot_number: 'lots',
      vendor_lot_number: 'lots',
      batch: 'lots',
      batch_id: 'lots',
      batch_number: 'lots',
      item: 'items',
      item_id: 'items',
      material: 'items',
      material_id: 'items',
      part: 'items',
      part_number: 'items',
      product: 'items',
      product_id: 'items',
      product_name: 'items',
      affected_product_id: 'items',
      revision: 'item_revisions',
      revision_id: 'item_revisions',
      part_revision: 'item_revisions',
      item_revision: 'item_revisions',
      work_center: 'work_centers',
      work_center_id: 'work_centers',
      operation: 'operations',
      operation_code: 'operations',
      operation_id: 'operation_records',
      routing_operation: 'operations',
      routing_operation_id: 'operation_records',
      process: 'operations',
      process_code: 'operations',
      process_name: 'operations',
      affected_process: 'operations',
      warehouse: 'warehouses',
      warehouse_id: 'warehouses',
      location: 'inventory_locations',
      location_id: 'inventory_locations',
      sales_order: 'sales_orders',
      sales_order_number: 'sales_orders',
      sales_order_id: 'sales_order_records',
      so_number: 'sales_orders',
      customer_po_number: 'sales_orders',
      purchase_order: 'sales_orders',
      purchase_order_number: 'purchase_orders',
      supplier_purchase_order: 'purchase_orders',
      supplier_po: 'purchase_orders',
      po_number: 'purchase_orders',
      po_id: 'purchase_order_records',
      quick_po: 'purchase_orders',
      incoterm: 'incoterms',
      incoterm_code: 'incoterms',
      payment_term: 'payment_terms',
      payment_term_code: 'payment_terms',
      shipping_method: 'shipping_methods',
      shipping_method_id: 'shipping_methods',
      promise_policy: 'promise_policies',
      promise_policy_id: 'promise_policies',
      owner: 'users',
      owner_user: 'users',
      owner_user_id: 'users',
      assigned_to: 'users',
      assignee: 'users',
      assignee_id: 'users',
      responsible_party: 'users',
      responsible_person: 'users',
      responsible_user: 'users',
      responsible_user_id: 'users',
      responsibility: 'users',
      lead_auditor: 'users',
      auditor: 'users',
      reviewer: 'users',
      inspector: 'users',
      analyst: 'users',
      operator: 'users',
      approver: 'users',
      prepared_by: 'users',
      preparer: 'users',
      form_preparer: 'users',
      issued_by: 'users',
      issuer: 'users',
      approved_by: 'users',
      reviewed_by: 'users',
      verified_by: 'users',
      performed_by: 'users',
      detected_by: 'users',
      requested_by: 'users',
      requester: 'users',
      requestor: 'users',
      initiated_by: 'users',
      originator: 'users',
      reported_by: 'users',
      submitted_by: 'users',
      submitter: 'users',
      recorded_by: 'users',
      closed_by: 'users',
      signed_by: 'users',
      accepted_by: 'users',
      rejected_by: 'users',
      new_action_owner: 'users',
      initial_action_owner: 'users',
      team_lead: 'users',
      rt_analyst: 'users',
      created_by: 'users',
      creator: 'users',
      created_user: 'users',
      trainer: 'users',
      instructor: 'users',
      employee: 'employees',
      employee_id: 'employees',
      employee_name: 'employees',
      trainee: 'employees',
      trainee_id: 'employees',
      equipment: 'equipment',
      equipment_id: 'equipment',
      equipment_system: 'equipment',
      machine: 'equipment',
      machine_id: 'equipment',
      tool: 'tools',
      tool_id: 'tools',
      tooling: 'tools',
      tooling_asset: 'tools',
      work_order: 'work_orders',
      workorder: 'work_orders',
      work_order_number: 'work_orders',
      work_order_id: 'work_order_records',
      wo: 'work_orders',
      wo_number: 'work_orders',
      wo_id: 'work_order_records',
      job_order: 'job_orders',
      job_number: 'job_orders',
      job_order_number: 'job_orders',
      job_order_id: 'job_order_records',
      production_order: 'production_orders',
      production_order_no: 'production_orders',
      production_order_number: 'production_orders',
      production_order_id: 'production_order_records',
      prod_order: 'production_orders',
      prod_order_no: 'production_orders',
      prod_order_number: 'production_orders',
      prod_order_id: 'production_order_records',
      manufacturing_order: 'production_orders',
      manufacturing_order_no: 'production_orders',
      manufacturing_order_number: 'production_orders',
      manufacturing_order_id: 'production_order_records',
      mo_number: 'production_orders',
      mo_id: 'production_order_records',
      program: 'cnc_programs',
      program_number: 'cnc_programs',
      cnc_program: 'cnc_programs',
      nc_program: 'cnc_programs',
      program_id: 'cnc_program_records',
      document_id: 'documents',
      doc_id: 'documents',
      audit_report_ref: 'documents',
      supersedes: 'documents',
      supersedes_doc_id: 'documents',
      superseded_document_id: 'documents',
      change_control_id: 'change_controls',
      linked_change_control_id: 'change_controls',
      capa_id: 'capa_records',
      linked_capa_id: 'capa_records',
      deviation_id: 'deviations',
      ncr_id: 'ncr_records',
      complaint_id: 'complaints',
      audit_id: 'audits',
      source_audit: 'audits',
      source_audit_id: 'audits',
      source_event_id: 'source_records',
      source_id: 'source_records',
      source_ref: 'source_records',
      source_reference: 'source_records',
      source_record: 'source_records',
      source_record_id: 'source_records',
      lab: 'test_labs',
      labs: 'test_labs',
      lab_code: 'test_labs',
      lab_id: 'test_labs',
      laboratory: 'test_labs',
      test_lab: 'test_labs',
      test_lab_id: 'test_labs',
      standard: 'eqms.standard_ref',
      req_source: 'eqms.standard_ref',
      release_type: 'eqms.release_type',
      action_type: 'eqms.action_type',
      type: 'eqms.type',
      status: 'eqms.status',
      severity: 'eqms.severity',
      priority: 'eqms.priority',
      source: 'eqms.source_type',
      source_type: 'eqms.source_type',
      source_event_type: 'eqms.source_type',
      change_type: 'eqms.change_type',
      change_category: 'eqms.change_category',
      deviation_type: 'eqms.deviation_type',
      document_type: 'eqms.document_type',
      doc_type: 'eqms.document_type',
      audit_type: 'eqms.audit_type',
      standard_ref: 'eqms.standard_ref',
      risk_level: 'eqms.risk_level',
      risk_tier: 'eqms.risk_level',
      overall_risk: 'eqms.risk_level',
      disposition: 'eqms.disposition',
      training_type: 'eqms.training_type',
      category: 'eqms.category',
      classification: 'eqms.classification',
      nc_type: 'eqms.nc_type',
      defect_type: 'eqms.defect_type',
      detection_method: 'eqms.detection_method',
      detection_point: 'eqms.detection_point',
      regulatory_impact: 'eqms.regulatory_impact',
      regulatory_notification: 'eqms.boolean',
      regulatory_notification_required: 'eqms.boolean',
      conc_regulatory_notification: 'eqms.boolean',
      conc_batch_impact: 'eqms.boolean',
      containment_needed: 'eqms.boolean',
      new_action_evidence: 'eqms.boolean',
      has_exceptions: 'eqms.boolean',
      escalated: 'eqms.boolean',
      p1_assignable_cause_found: 'eqms.boolean',
      p1_calculation_verified: 'eqms.boolean',
      p1_equipment_verified: 'eqms.boolean',
      p1_method_followed: 'eqms.boolean',
      p1_sample_integrity: 'eqms.boolean',
      overdue: 'eqms.boolean',
      overdue_only: 'eqms.overdue_filter',
      due_status: 'eqms.due_status',
      matrix_status: 'eqms.training_matrix_status',
      control_status: 'eqms.control_status',
      outcome: 'eqms.outcome',
      effectiveness: 'eqms.effectiveness',
      strategic_classification: 'eqms.strategic_classification',
      checklist_template: 'eqms.checklist_template',
      validation_type: 'eqms.validation_type',
      req_priority: 'eqms.requirement_priority',
      requirement_priority: 'eqms.requirement_priority',
      req_type: 'eqms.requirement_type',
      requirement_type: 'eqms.requirement_type',
      exec_status: 'eqms.execution_status',
      execution_status: 'eqms.execution_status',
      health_hazard_classification: 'eqms.hazard_class',
      hazard_class: 'eqms.hazard_class',
      urgency: 'eqms.urgency',
      level: 'eqms.capability_level',
      capability_level: 'eqms.capability_level',
      equipment_type: 'eqms.equipment_type',
      machine_type: 'eqms.equipment_type',
      fmea_type: 'eqms.fmea_type',
      response_method: 'eqms.response_method',
      rt_type: 'eqms.rt_type',
      study_type: 'eqms.study_type',
      format: 'eqms.format',
      decision: 'eqms.decision',
      vote: 'eqms.vote',
      impact: 'eqms.impact',
      quality_status: 'eqms.quality_status'
    };
    if (exact[key]) return exact[key];

    if (key.indexOf('customer_site') >= 0) return 'customer_sites';
    if (key === 'party' || key === 'party_code' || key === 'party_id' || key === 'partner' || key === 'partner_id' || key === 'partner_name') return /_id$/.test(key) ? 'party_records' : 'parties';
    if (key.indexOf('customer') >= 0) return 'customers';
    if (key.indexOf('supplier') >= 0 || key.indexOf('vendor') >= 0) return 'suppliers';
    if (key.indexOf('department') >= 0 || key.indexOf('dept') >= 0) return 'departments';
    if (key.indexOf('role') >= 0) return 'roles';
    if (key.indexOf('site') >= 0) return 'sites';
    if (key.indexOf('area') >= 0) return 'areas';
    if (key.indexOf('plant') >= 0) return 'plants';
    if (key.indexOf('lot') >= 0 || key.indexOf('batch') >= 0) return 'lots';
    if (key.indexOf('revision') >= 0) return 'item_revisions';
    if (key.indexOf('item') >= 0 || key.indexOf('part') >= 0 || key.indexOf('product') >= 0 || key.indexOf('material') >= 0) return 'items';
    if (key.indexOf('work_center') >= 0) return 'work_centers';
    if (key === 'operation' || key === 'operation_code' || key === 'process' || key === 'process_code' || key === 'process_name' || key === 'affected_process' || key.indexOf('routing_operation') >= 0) return /_id$/.test(key) ? 'operation_records' : 'operations';
    if (key.indexOf('warehouse') >= 0) return 'warehouses';
    if (key.indexOf('location') >= 0) return 'inventory_locations';
    if (/(^|_)(owner|assignee|assigned_to|responsible|responsibility|auditor|reviewer|approver|verifier|inspector|analyst|operator|trainer|instructor|requester|requestor|originator|author|signer|preparer|creator|issuer|submitter|pic|team_lead|lead_auditor)($|_)/.test(key) || /_by$/.test(key)) return 'users';
    if (/(^|_)(employee|trainee)($|_)/.test(key)) return 'employees';
    if (key === 'equipment' || key === 'equipment_id' || key === 'equipment_system' || key === 'machine' || key === 'machine_id' || /_equipment_id$/.test(key) || /_machine_id$/.test(key)) return 'equipment';
    if (key === 'tool' || key === 'tool_id' || key === 'tooling' || key === 'tooling_asset' || key.indexOf('tool_id') >= 0) return 'tools';
    if (key.indexOf('sales_order') >= 0 || key.indexOf('so_number') >= 0 || key.indexOf('purchase_order') >= 0) return /_id$/.test(key) ? 'sales_order_records' : 'sales_orders';
    if (key.indexOf('work_order') >= 0 || key.indexOf('workorder') >= 0) return /_id$/.test(key) ? 'work_order_records' : 'work_orders';
    if (key.indexOf('job_order') >= 0 || key.indexOf('job_number') >= 0) return /_id$/.test(key) ? 'job_order_records' : 'job_orders';
    if (key.indexOf('production_order') >= 0 || key.indexOf('prod_order') >= 0 || key.indexOf('manufacturing_order') >= 0 || key.indexOf('mo_number') >= 0) return /_id$/.test(key) ? 'production_order_records' : 'production_orders';
    if (key === 'program' || key === 'program_id' || key === 'program_number' || key.indexOf('cnc_program') >= 0 || key.indexOf('nc_program') >= 0) return /_id$/.test(key) ? 'cnc_program_records' : 'cnc_programs';
    if (key.indexOf('document') >= 0 || key === 'doc') return 'documents';
    if (key === 'lab' || key === 'labs' || key === 'lab_code' || key === 'lab_id' || key === 'laboratory' || key === 'test_lab' || key === 'test_lab_id') return 'test_labs';

    if (key === 'status' || /_status$/.test(key)) return 'eqms.status';
    if (key === 'severity' || /_severity$/.test(key)) return 'eqms.severity';
    if (key === 'priority' || /_priority$/.test(key)) return 'eqms.priority';
    if (key === 'source' || key === 'source_type') return 'eqms.source_type';
    if (key === 'change_type') return 'eqms.change_type';
    if (key === 'change_category') return 'eqms.change_category';
    if (key === 'deviation_type') return 'eqms.deviation_type';
    if (key === 'document_type') return 'eqms.document_type';
    if (key === 'audit_type') return 'eqms.audit_type';
    if (key === 'standard_ref') return 'eqms.standard_ref';
    if (key === 'risk_level' || key === 'risk_tier') return 'eqms.risk_level';
    if (key === 'disposition') return 'eqms.disposition';
    if (key === 'training_type') return 'eqms.training_type';
    if (key === 'category' && field.type === 'select') return 'eqms.category';
    if (field.type === 'select') return 'eqms.' + key;

    return '';
  }

  function scheduleReferenceHydration(root) {
    if (root && root.nodeType === 1) {
      root.setAttribute('data-eqms-reference-root', '1');
    }
    if (referenceHydrationScheduled) return;
    referenceHydrationScheduled = true;
    setTimeout(function() {
      referenceHydrationScheduled = false;
      hydrateReferenceControls(document);
    }, 0);
  }

  function loadReferenceOptions(keys, search) {
    keys = (keys || []).map(normalizeReferenceKey).filter(Boolean);
    keys = keys.filter(function(k, i) { return keys.indexOf(k) === i; });
    search = String(search || '').trim();
    var missing = keys.filter(function(k) {
      var cacheKey = referenceCacheKey(k, search);
      return !referenceCache[cacheKey] && !referencePending[cacheKey];
    });
    if (missing.length) {
      var request = apiCall('eqms_reference_options', { keys: missing, limit: 200, q: search }, 'POST', 15000)
        .then(function(res) {
          var references = (res && (res.references || res.data)) || {};
          missing.forEach(function(k) {
            var cacheKey = referenceCacheKey(k, search);
            var entry = references[k] || {};
            if (entry.ok === false) {
              referenceCache[cacheKey] = { ok: false, options: [], error: entry.detail || entry.error || 'reference_load_failed' };
            } else {
              referenceCache[cacheKey] = { ok: true, options: entry.options || [] };
            }
            delete referencePending[cacheKey];
          });
          return referenceCache;
        })
        .catch(function(err) {
          missing.forEach(function(k) {
            var cacheKey = referenceCacheKey(k, search);
            referenceCache[cacheKey] = { ok: false, options: [], error: err.message || 'reference_load_failed' };
            delete referencePending[cacheKey];
          });
          return referenceCache;
        });
      missing.forEach(function(k) { referencePending[referenceCacheKey(k, search)] = request; });
    }

    return Promise.all(keys.map(function(k) {
      var cacheKey = referenceCacheKey(k, search);
      return referencePending[cacheKey] || Promise.resolve(referenceCache[cacheKey]);
    })).then(function() {
      var out = {};
      keys.forEach(function(k) { out[k] = referenceCache[referenceCacheKey(k, search)] || { ok: true, options: [] }; });
      return out;
    });
  }

  function renderCurrentReferenceOption(currentValue) {
    if (!currentValue) return '';
    return '<option value="' + esc(currentValue) + '" selected>' + esc(currentValue) + '</option>';
  }

  function renderReferenceSelect(className, dataAttr, fieldKey, referenceKey, currentValue, emptyLabel, required, width) {
    scheduleReferenceHydration();
    var style = width ? ' style="width:' + esc(width) + '"' : '';
    var selectRef = 'eqms-ref-' + (++referenceControlSeq);
    var html = '<div class="eqms-reference-picker" data-eqms-reference-picker="1">';
    html += '<input type="search" class="eqms-reference-search" data-eqms-reference-search="' + esc(referenceKey) + '"' +
      ' data-eqms-reference-target="' + esc(selectRef) + '"' +
      ' placeholder="' + esc(T({ vi: 'Tìm trong DB...', en: 'Search DB...' })) + '"' +
      (style || '') + '>';
    html += '<select class="' + esc(className) + '" ' + dataAttr + '="' + esc(fieldKey) + '"' +
      ' data-eqms-reference="' + esc(referenceKey) + '"' +
      ' data-eqms-reference-select-id="' + esc(selectRef) + '"' +
      ' data-current-value="' + esc(currentValue || '') + '"' +
      ' data-empty-label="' + esc(emptyLabel) + '"' +
      (required ? ' required' : '') + style + ' disabled>';
    html += '<option value="">' + esc(T({ vi: 'Dang tai du lieu DB...', en: 'Loading DB data...' })) + '</option>';
    html += renderCurrentReferenceOption(currentValue || '');
    html += '</select>';
    html += '</div>';
    return html;
  }

  function hydrateReferenceControls(root) {
    root = root || document;
    bindReferenceControls(root);
    var controls = Array.prototype.slice.call(root.querySelectorAll('select[data-eqms-reference]'))
      .filter(function(el) { return el.getAttribute('data-eqms-reference-loaded') !== '1' && el.getAttribute('data-eqms-reference-loading') !== '1'; });
    if (!controls.length) return Promise.resolve({});

    var keys = controls.map(function(el) { return normalizeReferenceKey(el.getAttribute('data-eqms-reference')); })
      .filter(Boolean)
      .filter(function(k, i, arr) { return arr.indexOf(k) === i; });
    controls.forEach(function(el) { el.setAttribute('data-eqms-reference-loading', '1'); });

    return loadReferenceOptions(keys).then(function(map) {
      controls.forEach(function(el) {
        var key = normalizeReferenceKey(el.getAttribute('data-eqms-reference'));
        fillReferenceControl(el, map[key] || { ok: true, options: [] });
      });
      return map;
    });
  }

  function bindReferenceControls(root) {
    root = root || document;
    Array.prototype.slice.call(root.querySelectorAll('select[data-eqms-reference]')).forEach(function(select) {
      if (select.getAttribute('data-eqms-reference-bound') === '1') return;
      select.setAttribute('data-eqms-reference-bound', '1');
      select.addEventListener('change', function() {
        if (select.hasAttribute('multiple')) {
          var values = Array.prototype.slice.call(select.selectedOptions || []).map(function(opt) { return opt.value; }).filter(Boolean);
          select.setAttribute('data-current-value', JSON.stringify(values));
        } else {
          select.setAttribute('data-current-value', select.value || '');
        }
      });
    });

    Array.prototype.slice.call(root.querySelectorAll('input[data-eqms-reference-search]')).forEach(function(input) {
      if (input.getAttribute('data-eqms-reference-search-bound') === '1') return;
      input.setAttribute('data-eqms-reference-search-bound', '1');
      input.addEventListener('input', function() {
        var key = normalizeReferenceKey(input.getAttribute('data-eqms-reference-search'));
        var target = input.getAttribute('data-eqms-reference-target') || '';
        var select = target
          ? (root.querySelector('select[data-eqms-reference-select-id="' + target + '"]') || document.querySelector('select[data-eqms-reference-select-id="' + target + '"]'))
          : null;
        if (!key || !select) return;
        var timerKey = target || key;
        clearTimeout(referenceSearchTimers[timerKey]);
        referenceSearchTimers[timerKey] = setTimeout(function() {
          var query = String(input.value || '').trim();
          var requestSeq = String(Date.now()) + '-' + Math.random();
          select.setAttribute('data-eqms-reference-search-seq', requestSeq);
          select.setAttribute('data-eqms-reference-loading', '1');
          select.disabled = true;
          loadReferenceOptions([key], query).then(function(map) {
            if (select.getAttribute('data-eqms-reference-search-seq') !== requestSeq) return;
            fillReferenceControl(select, map[key] || { ok: true, options: [] });
          });
        }, 250);
      });
    });
  }

  function fillReferenceControl(select, entry) {
    var current = select.getAttribute('data-current-value') || select.value || '';
    var isMultiple = select.hasAttribute('multiple') || select.getAttribute('data-eqms-reference-multiple') === '1';
    var currentValues = [];
    if (isMultiple) {
      try {
        var parsed = JSON.parse(current || '[]');
        currentValues = Array.isArray(parsed) ? parsed.map(String) : [];
      } catch (e) {
        currentValues = String(current || '').split(/[|,]/).map(function(v) { return v.trim(); }).filter(Boolean);
      }
    }
    var emptyLabel = select.getAttribute('data-empty-label') || T({ vi: 'Chon...', en: 'Select...' });
    var keepDisabled = select.getAttribute('data-eqms-reference-readonly') === '1';
    var options = (entry && entry.options) || [];
    var html = isMultiple ? '' : '<option value="">' + esc(emptyLabel) + '</option>';
    var foundCurrent = isMultiple ? currentValues.length === 0 : !current;

    if (entry && entry.ok === false) {
      html = '<option value="">' + esc(T({ vi: 'Khong tai duoc du lieu DB', en: 'Failed to load DB data' })) + '</option>';
      if (isMultiple) {
        currentValues.forEach(function(value) { html += renderCurrentReferenceOption(value); });
      } else if (current) {
        html += renderCurrentReferenceOption(current);
      }
      select.innerHTML = html;
      select.disabled = true;
      select.title = entry.error || 'reference_load_failed';
      select.removeAttribute('data-eqms-reference-loading');
      select.setAttribute('data-eqms-reference-loaded', '1');
      return;
    }

    options.forEach(function(option) {
      var val = option && option.value != null ? String(option.value) : '';
      if (!val) return;
      var lbl = option && option.label != null ? String(option.label) : val;
      var selected = isMultiple ? currentValues.indexOf(val) >= 0 : (current && val === current);
      if (selected) foundCurrent = true;
      html += '<option value="' + esc(val) + '"' + (selected ? ' selected' : '') + '>' + esc(lbl) + '</option>';
    });
    if (isMultiple) {
      currentValues.forEach(function(value) {
        var exists = options.some(function(option) { return String(option && option.value != null ? option.value : '') === value; });
        if (value && !exists) html += renderCurrentReferenceOption(value);
      });
    } else if (current && !foundCurrent) {
      html += renderCurrentReferenceOption(current);
    }
    if (!options.length && !current && !isMultiple) {
      html += '<option value="" disabled>' + esc(T({ vi: 'DB chua co du lieu', en: 'No DB records' })) + '</option>';
    }

    select.innerHTML = html;
    select.disabled = keepDisabled;
    select.removeAttribute('data-eqms-reference-loading');
    select.setAttribute('data-eqms-reference-loaded', '1');
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
      var referenceKey = inferReferenceKey(f);
      if (referenceKey) {
        html += renderReferenceSelect(
          'eqms-filter-select',
          'data-filter',
          f.key,
          referenceKey,
          filters[f.key] || '',
          T({ vi: 'Tất cả', en: 'All' }),
          false,
          f.width || null
        );
      } else if (f.type === 'select') {
        html += '<select class="eqms-filter-select" data-filter="' + esc(f.key) + '" disabled>';
        html += '<option value="">' + esc(T({ vi: 'Chua cau hinh reference DB', en: 'DB reference not configured' })) + '</option>';
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
  // Sprint 7E: virtual scroll threshold
  var VIRTUAL_SCROLL_THRESHOLD = 150;

  function renderDataGrid(columns, data, config) {
    config = config || {};
    var isLarge = data && data.length > VIRTUAL_SCROLL_THRESHOLD;

    // Sprint 7E: wrap large grids in a scrollable container that triggers
    // CSS content-visibility for off-screen rows (modern browser optimisation).
    var wrapperAttrs = 'class="eqms-grid-wrapper' + (isLarge ? ' eqms-grid-virtual' : '') + '"';
    if (isLarge) {
      wrapperAttrs += ' style="overflow-y:auto;max-height:60vh"';
    }
    var html = '<div ' + wrapperAttrs + '>';
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
        var rowId = row.id || row.record_id || row[config.rowKey || ''] ||
          row.complaint_id || row.deviation_id || row.ncr_id || row.capa_id ||
          row.change_control_id || row.ec_id || row.doc_id || row.training_record_id ||
          row.audit_id || row.supplier_profile_id || row.supplier_audit_id ||
          row.scar_id || row.risk_id || row.fmea_id || row.calibration_id ||
          row.msa_id || row.investigation_id || row.inspection_id || row.spc_id ||
          row.batch_release_id || row.project_id || row.field_action_id ||
          row.thread_id || row.agreement_id || '';
        // Sprint 7E: content-visibility on large grids
        var rowStyle = isLarge ? ' style="content-visibility:auto;contain-intrinsic-size:auto 44px"' : '';
        html += '<tr data-id="' + esc(rowId) + '"' + rowStyle + '>';
        if (config.selectable) html += '<td><input type="checkbox" data-action="select-row" data-id="' + esc(rowId) + '"></td>';
        columns.forEach(function(col) {
          var val = row[col.key];
          var cls = '';
          if (col.type === 'id') cls = 'eqms-cell-id';
          else if (col.type === 'date') cls = 'eqms-cell-date';
          else if (col.type === 'truncate') cls = 'eqms-cell-truncate';

          // Sprint 7E: data-label for mobile card view
          var colLabel = T(col.label || {});
          html += '<td' + (cls ? ' class="' + cls + '"' : '') + ' data-label="' + esc(colLabel) + '">';
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
    html += '</tbody></table>';
    // Sprint 7E: large grid row count indicator
    if (isLarge) {
      html += '<div class="eqms-grid-virtual-info">'
        + T({ vi: 'Hiển thị ', en: 'Showing ' }) + data.length
        + T({ vi: ' dòng — cuộn để xem thêm', en: ' rows — scroll to view all' })
        + '</div>';
    }
    html += '</div>';
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
    var html = '<div class="eqms-tabs" role="tablist">';
    tabs.forEach(function(tab) {
      var id = tab.id || tab;
      var label = tab.label || tab;
      var badge = tab.badge;
      var isActive = id === activeTab;
      html += '<div role="tab"'
        + ' aria-selected="' + (isActive ? 'true' : 'false') + '"'
        + ' tabindex="' + (isActive ? '0' : '-1') + '"'
        + ' class="eqms-tab ' + (isActive ? 'active' : '') + '"'
        + ' data-tab="' + esc(id) + '">';
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
    var fieldType = field.type || 'text';
    var referenceKey = inferReferenceKey(field);
    var referenceAllowed = ['textarea', 'date', 'number', 'checkbox', 'hidden', 'file'].indexOf(fieldType) === -1;
    if (referenceKey && referenceAllowed) {
      html += renderReferenceSelect(
        'eqms-form-select',
        'data-field',
        field.key,
        referenceKey,
        field.value || '',
        T({ vi: 'Chọn...', en: 'Select...' }),
        !!field.required,
        null
      );
    } else if (field.type === 'select') {
      html += '<select class="eqms-form-select" data-field="' + esc(field.key) + '"' + (field.required ? ' required' : '') + ' disabled>';
      html += '<option value="">' + esc(T({ vi: 'Chua cau hinh reference DB', en: 'DB reference not configured' })) + '</option>';
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
      'quality-agreements': T({ vi: 'Thoả thuận chất lượng, hợp tác đối tác', en: 'Quality agreements, partner collaboration' }),
      'apqp-ppap':              T({ vi: 'APQP 5 pha, gate reviews, PPAP cấp độ 1-5, PSW (IATF 16949 / AS9145)', en: 'APQP 5-phase, gate reviews, PPAP levels 1-5, PSW (IATF 16949 / AS9145)' }),
      'concessions':            T({ vi: 'Ủy quyền nhượng bộ, dùng nguyên trạng, thẩm quyền phê duyệt', en: 'Concession authorization, use-as-is disposition, approval authority' }),
      'lessons-learned':        T({ vi: 'Thu thập bài học, tra cứu theo dự án/sản phẩm, tái sử dụng', en: 'Capture lessons, search by project/product, reuse across programs' }),
      'customer-satisfaction':  T({ vi: 'CSAT, NPS, khảo sát, xu hướng, phân tích gốc rễ', en: 'CSAT, NPS, surveys, trends, dissatisfaction root-cause linkage' }),
      'aml':                    T({ vi: 'Danh sách NCC được duyệt, trạng thái, gia hạn, phong toả', en: 'Approved supplier list, status, renewal, blocking' }),
      'sampling-plans':         T({ vi: 'Kế hoạch lấy mẫu AQL, skip-lot, gán cho nhóm sản phẩm', en: 'AQL sampling plans, skip-lot, assignment to product families' }),
      'warranty':               T({ vi: 'Yêu cầu bảo hành, khiếu kiện NCC, phân tích lỗi thực địa', en: 'Warranty claims, supplier charge-backs, field failure analysis' }),
      'special-characteristics': T({ vi: 'Đặc tính SC/CC, phân loại, liên kết FMEA/bản vẽ', en: 'SC/CC characteristics, classification, FMEA/drawing linkage' }),
      'fai':                    T({ vi: 'Báo cáo kiểm tra lần đầu AS9102/PPAP, phê duyệt, kho lưu', en: 'First article inspection AS9102/PPAP, approval, record vault' })
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
    html += renderGlobalSearch();
    html += renderCommandCenterStrip();
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
    scheduleReferenceHydration(container);
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
  // BACKBONE 1: CANONICAL ENTITY MODEL
  // =========================================================================
  var ENTITY_MODEL = {
    // Quality Events
    complaint:          { module: 'complaints',         icon: '\u{1F4E2}', label: { vi: 'Khiếu nại', en: 'Complaint' },         color: 'var(--eqms-entity-complaint,#ef4444)' },
    deviation:          { module: 'deviations',         icon: '\u26A0\uFE0F', label: { vi: 'Sự kiện CL', en: 'Deviation' },      color: 'var(--eqms-entity-deviation,#f97316)' },
    ncr:                { module: 'ncr',                icon: '\u{1F6AB}', label: { vi: 'NCR', en: 'NCR' },                      color: 'var(--eqms-entity-ncr,#dc2626)' },
    mrbDecision:        { module: 'ncr',                icon: '\u2696\uFE0F', label: { vi: 'MRB', en: 'MRB Decision' },          color: 'var(--eqms-entity-mrb,#b91c1c)' },
    capa:               { module: 'capa',               icon: '\u{1F527}', label: { vi: 'CAPA', en: 'CAPA' },                    color: 'var(--eqms-entity-capa,#8b5cf6)' },
    // Documents & Change
    changeControl:      { module: 'change-control',     icon: '\u{1F504}', label: { vi: 'Kiểm soát TĐ', en: 'Change Control' }, color: 'var(--eqms-entity-change-control,#3b82f6)' },
    engineeringChange:  { module: 'engineering-change',  icon: '\u2699\uFE0F', label: { vi: 'ECO/ECR', en: 'Eng. Change' },      color: 'var(--eqms-entity-eng-change,#2563eb)' },
    controlledDocument: { module: 'documents',          icon: '\u{1F4C4}', label: { vi: 'Tài liệu', en: 'Document' },           color: 'var(--eqms-entity-document,#0ea5e9)' },
    trainingProgram:    { module: 'training',           icon: '\u{1F393}', label: { vi: 'Đào tạo', en: 'Training' },             color: 'var(--eqms-entity-training,#06b6d4)' },
    competencyMatrix:   { module: 'training',           icon: '\u{1F4CA}', label: { vi: 'Ma trận NL', en: 'Competency' },        color: 'var(--eqms-entity-competency,#0891b2)' },
    assessment:         { module: 'training',           icon: '\u{1F4DD}', label: { vi: 'Đánh giá', en: 'Assessment' },          color: 'var(--eqms-entity-assessment,#0e7490)' },
    // Audits & Compliance
    auditProgram:       { module: 'audits',             icon: '\u{1F50D}', label: { vi: 'Đánh giá', en: 'Audit' },               color: 'var(--eqms-entity-audit,#059669)' },
    auditFinding:       { module: 'audits',             icon: '\u{1F4CB}', label: { vi: 'Phát hiện', en: 'Finding' },             color: 'var(--eqms-entity-finding,#047857)' },
    // Supplier Quality
    supplier:           { module: 'suppliers',          icon: '\u{1F310}', label: { vi: 'NCC', en: 'Supplier' },                 color: 'var(--eqms-entity-supplier,#7c3aed)' },
    supplierEvaluation: { module: 'suppliers',          icon: '\u{1F4C8}', label: { vi: 'Đánh giá NCC', en: 'Evaluation' },      color: 'var(--eqms-entity-evaluation,#6d28d9)' },
    scar:               { module: 'supplier-audits',    icon: '\u{1F6A8}', label: { vi: 'SCAR', en: 'SCAR' },                    color: 'var(--eqms-entity-scar,#9333ea)' },
    supplierAudit:      { module: 'supplier-audits',    icon: '\u{1F50E}', label: { vi: 'ĐG NCC', en: 'Supplier Audit' },        color: 'var(--eqms-entity-supplier-audit,#a855f7)' },
    qualityAgreement:   { module: 'quality-agreements', icon: '\u{1F91D}', label: { vi: 'Thoả thuận CL', en: 'QA Agreement' },   color: 'var(--eqms-entity-quality-agreement,#c084fc)' },
    // Risk & Compliance
    riskItem:           { module: 'risks',              icon: '\u{1F6E1}\uFE0F', label: { vi: 'Rủi ro', en: 'Risk' },            color: 'var(--eqms-entity-risk,#ea580c)' },
    fmeaItem:           { module: 'risks',              icon: '\u{1F4D0}', label: { vi: 'FMEA', en: 'FMEA' },                    color: 'var(--eqms-entity-fmea,#d97706)' },
    // Calibration & Lab
    calibrationAsset:   { module: 'calibration',        icon: '\u{1F4CF}', label: { vi: 'Hiệu chuẩn', en: 'Calibration' },      color: 'var(--eqms-entity-calibration,#65a30d)' },
    msaStudy:           { module: 'calibration',        icon: '\u{1F4D0}', label: { vi: 'MSA', en: 'MSA Study' },                color: 'var(--eqms-entity-msa,#4d7c0f)' },
    oosInvestigation:   { module: 'lab-investigations', icon: '\u{1F52C}', label: { vi: 'OOS/OOT', en: 'OOS Investigation' },    color: 'var(--eqms-entity-oos,#ca8a04)' },
    // Inspection & Testing
    iqcInspection:      { module: 'inspection',         icon: '\u2705', label: { vi: 'IQC', en: 'IQC Inspection' },              color: 'var(--eqms-entity-iqc,#16a34a)' },
    inspectionResult:   { module: 'inspection',         icon: '\u{1F4CB}', label: { vi: 'Kết quả KT', en: 'Inspection Result' }, color: 'var(--eqms-entity-inspection-result,#15803d)' },
    spcStudy:           { module: 'spc',                icon: '\u{1F4C8}', label: { vi: 'SPC', en: 'SPC Study' },                color: 'var(--eqms-entity-spc,#0d9488)' },
    testResult:         { module: 'spc',                icon: '\u{1F9EA}', label: { vi: 'Kết quả TN', en: 'Test Result' },       color: 'var(--eqms-entity-test-result,#0f766e)' },
    lotRelease:         { module: 'batch-release',      icon: '\u{1F4E6}', label: { vi: 'Giải phóng lô', en: 'Lot Release' },    color: 'var(--eqms-entity-lot-release,#0369a1)' },
    // Advanced
    validationPackage:  { module: 'validation',         icon: '\u{1F9EA}', label: { vi: 'Xác nhận', en: 'Validation' },          color: 'var(--eqms-entity-validation,#4338ca)' },
    fieldAction:        { module: 'field-actions',      icon: '\u{1F6A8}', label: { vi: 'Hành động TĐ', en: 'Field Action' },    color: 'var(--eqms-entity-field-action,#be123c)' },
    // New modules v4.1
    concession:         { module: 'concessions',        icon: '\u{1F4DD}', label: { vi: 'Nhượng bộ', en: 'Concession' },           color: 'var(--eqms-entity-concession,#fb923c)' },
    lessonLearned:      { module: 'lessons-learned',    icon: '\u{1F4A1}', label: { vi: 'Bài học KN', en: 'Lesson Learned' },       color: 'var(--eqms-entity-lesson-learned,#facc15)' },
    csatSurvey:         { module: 'customer-satisfaction', icon: '\u2B50', label: { vi: 'CSAT', en: 'CSAT Survey' },                color: 'var(--eqms-entity-csat,#f59e0b)' },
    amlEntry:           { module: 'aml',                icon: '\u2705',    label: { vi: 'NCC được duyệt', en: 'Approved Supplier' }, color: 'var(--eqms-entity-aml,#16a34a)' },
    samplingPlan:       { module: 'sampling-plans',     icon: '\u{1F4CA}', label: { vi: 'Kế hoạch mẫu', en: 'Sampling Plan' },      color: 'var(--eqms-entity-sampling-plan,#0891b2)' },
    warrantyClaim:      { module: 'warranty',           icon: '\u{1F6E0}\uFE0F', label: { vi: 'Bảo hành', en: 'Warranty Claim' },  color: 'var(--eqms-entity-warranty,#dc2626)' },
    specialChar:        { module: 'special-characteristics', icon: '\u{1F536}', label: { vi: 'SC/CC', en: 'Special Char.' },        color: 'var(--eqms-entity-special-char,#7c3aed)' },
    faiReport:          { module: 'fai',                icon: '\u{1F195}', label: { vi: 'FAI', en: 'FAI Report' },                  color: 'var(--eqms-entity-fai,#2563eb)' },
    apqpProject:        { module: 'apqp-ppap',          icon: '\u{1F3AF}', label: { vi: 'APQP', en: 'APQP Project' },              color: 'var(--eqms-entity-apqp,#059669)' },
    // Cross-cutting
    attachmentEvidence: { module: null, icon: '\u{1F4CE}', label: { vi: 'Bằng chứng', en: 'Evidence' },       color: 'var(--eqms-entity-evidence,#64748b)' },
    approvalAction:     { module: null, icon: '\u2705',    label: { vi: 'Phê duyệt', en: 'Approval' },        color: 'var(--eqms-entity-approval,#22c55e)' },
    signatureEvent:     { module: null, icon: '\u270D\uFE0F', label: { vi: 'Chữ ký', en: 'Signature' },       color: 'var(--eqms-entity-signature,#1d4ed8)' },
    auditEvent:         { module: null, icon: '\u{1F4DC}', label: { vi: 'Sự kiện ĐG', en: 'Audit Event' },    color: 'var(--eqms-entity-audit-event,#475569)' },
    linkedRecord:       { module: null, icon: '\u{1F517}', label: { vi: 'Liên kết', en: 'Linked Record' },    color: 'var(--eqms-entity-linked,#6366f1)' },
    task:               { module: null, icon: '\u2611\uFE0F', label: { vi: 'Nhiệm vụ', en: 'Task' },         color: 'var(--eqms-entity-task,#f59e0b)' },
    comment:            { module: null, icon: '\u{1F4AC}', label: { vi: 'Bình luận', en: 'Comment' },         color: 'var(--eqms-entity-comment,#a3a3a3)' }
  };

  // Link semantics for traceability graph
  var LINK_TYPES = {
    'caused-by':     { label: { vi: 'Gây ra bởi',    en: 'Caused by' },     arrow: '\u2190', color: 'var(--eqms-link-caused-by,#ef4444)' },
    'related-to':    { label: { vi: 'Liên quan đến',  en: 'Related to' },    arrow: '\u2194', color: 'var(--eqms-link-related-to,#3b82f6)' },
    'requires':      { label: { vi: 'Yêu cầu',       en: 'Requires' },      arrow: '\u2192', color: 'var(--eqms-link-requires,#f97316)' },
    'verifies':      { label: { vi: 'Xác minh',       en: 'Verifies' },      arrow: '\u2192', color: 'var(--eqms-link-verifies,#22c55e)' },
    'trains':        { label: { vi: 'Đào tạo',        en: 'Trains' },        arrow: '\u2192', color: 'var(--eqms-link-trains,#06b6d4)' },
    'releases':      { label: { vi: 'Giải phóng',     en: 'Releases' },      arrow: '\u2192', color: 'var(--eqms-link-releases,#8b5cf6)' },
    'sourced-from':  { label: { vi: 'Nguồn từ',       en: 'Sourced from' },  arrow: '\u2190', color: 'var(--eqms-link-sourced-from,#7c3aed)' },
    'supersedes':    { label: { vi: 'Thay thế',       en: 'Supersedes' },    arrow: '\u2192', color: 'var(--eqms-link-supersedes,#64748b)' },
    'contains':      { label: { vi: 'Chứa',           en: 'Contains' },      arrow: '\u2192', color: 'var(--eqms-link-contains,#0ea5e9)' },
    'implements':    { label: { vi: 'Thực hiện',      en: 'Implements' },    arrow: '\u2192', color: 'var(--eqms-link-implements,#059669)' },
    'mitigates':     { label: { vi: 'Giảm thiểu',    en: 'Mitigates' },     arrow: '\u2192', color: 'var(--eqms-link-mitigates,#16a34a)' }
  };

  // =========================================================================
  // BACKBONE 2: ENHANCED ERROR STATE TAXONOMY
  // =========================================================================
  var ERROR_STATES = {
    no_data:          { icon: '\u{1F4CB}', title: { vi: 'Không có dữ liệu',          en: 'No data' },              cls: 'info' },
    not_configured:   { icon: '\u2699\uFE0F', title: { vi: 'Chưa được cấu hình',     en: 'Not configured' },       cls: 'warning' },
    permission_denied:{ icon: '\u{1F512}', title: { vi: 'Không có quyền truy cập',    en: 'Permission denied' },    cls: 'danger' },
    upstream_failure:  { icon: '\u26A1', title: { vi: 'Lỗi dịch vụ upstream',         en: 'Upstream service failure' }, cls: 'danger' },
    stale_cache:      { icon: '\u{1F504}', title: { vi: 'Dữ liệu cũ / cache hết hạn', en: 'Stale cache' },         cls: 'warning' },
    retrying:         { icon: '\u23F3', title: { vi: 'Đang thử lại...',               en: 'Retrying...' },           cls: 'info' },
    partial_data:     { icon: '\u{1F4CA}', title: { vi: 'Dữ liệu không đầy đủ',      en: 'Partial data loaded' },  cls: 'warning' },
    network_error:    { icon: '\u{1F310}', title: { vi: 'Lỗi mạng',                   en: 'Network error' },        cls: 'danger' },
    unknown_action:   { icon: '\u2753', title: { vi: 'Hành động không xác định',      en: 'Unknown action' },       cls: 'danger' },
    version_conflict: { icon: '\u{1F500}', title: { vi: 'Xung đột phiên bản',        en: 'Version conflict' },     cls: 'warning' }
  };

  /**
   * Enhanced error state renderer with taxonomy-aware diagnostics.
   * Replaces the basic renderErrorState for EQMS-specific error handling.
   */
  function renderRichErrorState(error, retryAction, config) {
    config = config || {};
    var errorKey = classifyError(error);
    var errorDef = ERROR_STATES[errorKey] || ERROR_STATES.upstream_failure;

    var html = '<div class="eqms-error-state eqms-error-' + errorDef.cls + '">';
    html += '<div class="eqms-error-state-icon">' + errorDef.icon + '</div>';
    html += '<div class="eqms-error-state-title">' + esc(T(errorDef.title)) + '</div>';
    var msg = typeof error === 'string' ? error : (error && error.message) || '';
    if (msg) html += '<div class="eqms-error-state-desc">' + esc(msg) + '</div>';

    // Diagnostic info for developers
    if (config.endpoint) {
      html += '<div class="eqms-error-diagnostic">';
      html += '<code>' + esc(config.endpoint) + '</code>';
      if (error && error.status) html += ' <span class="eqms-badge">' + error.status + '</span>';
      html += '</div>';
    }

    // Action buttons
    html += '<div class="eqms-error-actions">';
    if (retryAction) {
      html += '<button class="eqms-btn primary sm" data-action="' + esc(retryAction) + '">' + T({ vi: 'Thử lại', en: 'Retry' }) + '</button>';
    }
    if (errorKey === 'permission_denied') {
      html += '<button class="eqms-btn secondary sm" data-action="request-access">' + T({ vi: 'Yêu cầu quyền', en: 'Request Access' }) + '</button>';
    }
    if (errorKey === 'stale_cache') {
      html += '<button class="eqms-btn secondary sm" data-action="force-refresh">' + T({ vi: 'Làm mới', en: 'Force Refresh' }) + '</button>';
    }
    html += '</div></div>';
    return html;
  }

  function classifyError(error) {
    if (!error) return 'upstream_failure';
    var msg = (typeof error === 'string' ? error : (error.message || error.error || '')).toLowerCase();
    var status = error && error.status;

    if (status === 403 || msg.indexOf('permission') >= 0 || msg.indexOf('forbidden') >= 0 || msg.indexOf('quyền') >= 0) return 'permission_denied';
    if (status === 412 || msg.indexOf('version') >= 0 || msg.indexOf('conflict') >= 0) return 'version_conflict';
    if (status === 400 && msg.indexOf('unknown_action') >= 0) return 'unknown_action';
    if (msg.indexOf('network') >= 0 || msg.indexOf('fetch') >= 0 || msg.indexOf('timeout') >= 0) return 'network_error';
    if (msg.indexOf('not configured') >= 0 || msg.indexOf('chưa cấu hình') >= 0) return 'not_configured';
    if (msg.indexOf('stale') >= 0 || msg.indexOf('cache') >= 0) return 'stale_cache';
    if (msg.indexOf('partial') >= 0 || msg.indexOf('incomplete') >= 0) return 'partial_data';
    if (msg.indexOf('no data') >= 0 || msg.indexOf('empty') >= 0 || msg.indexOf('not found') >= 0) return 'no_data';
    if (status >= 500) return 'upstream_failure';
    return 'upstream_failure';
  }

  // =========================================================================
  // BACKBONE 3: ENHANCED API WRAPPER WITH ERROR CLASSIFICATION
  // =========================================================================
  function apiCallEnhanced(action, payload, method, config) {
    config = config || {};
    method = method || 'POST';
    var timeout = config.timeout || 30000; // 30s default timeout
    var url = 'api/index.php?action=' + encodeURIComponent(action);
    var opts = { method: method, headers: { 'Content-Type': 'application/json' }, credentials: 'include' };
    if (window.csrfToken) opts.headers['X-CSRF-Token'] = window.csrfToken;
    if (config.version) opts.headers['If-Match'] = '"' + config.version + '"';
    if (method !== 'GET' && payload) opts.body = JSON.stringify(payload);
    if (method === 'GET' && payload) {
      var qs = queryStringFromPayload(payload);
      if (qs) url += '&' + qs;
    }

    var retries = config.retries || 0;
    var attempt = 0;

    function doFetch() {
      var controller = new AbortController();
      var timer = setTimeout(function() { controller.abort(); }, timeout);
      var fetchOpts = Object.assign({}, opts, { signal: controller.signal });
      return fetch(url, fetchOpts).then(function(r) {
        clearTimeout(timer);
        var result = r.json();
        return result.then(function(data) {
          data = normalizeApiResponse(data, r.status);
          if (!r.ok && !data.success && !data.ok) {
            var err = new Error(data.error || data.message || 'Request failed');
            err.status = r.status;
            err.data = data;
            throw err;
          }
          return data;
        });
      }).catch(function(err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
          var timeoutErr = new Error('Request timed out after ' + (timeout/1000) + 's');
          timeoutErr.status = 0;
          timeoutErr.data = { ok: false, success: false, error: 'timeout' };
          throw timeoutErr;
        }
        if (attempt < retries && (!err.status || err.status >= 500)) {
          attempt++;
          return new Promise(function(resolve) {
            setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt - 1), 8000));
          }).then(doFetch);
        }
        throw err;
      });
    }

    return doFetch();
  }

  // =========================================================================
  // BACKBONE 4: GLOBAL INBOX / WORK QUEUE RENDERER
  // =========================================================================
  function renderGlobalInbox(container, config) {
    config = config || {};
    var html = '<div class="eqms-global-inbox">';
    html += '<div class="eqms-section-header">';
    html += '<span>' + T({ vi: 'Hộp thư EQMS', en: 'EQMS Inbox' }) + '</span>';
    html += '<div style="display:flex;gap:6px">';
    html += '<button class="eqms-btn ghost sm" data-action="inbox-refresh">\u{1F504}</button>';
    html += '<select class="eqms-filter-select" data-filter="inbox-scope" style="font-size:12px">';
    html += '<option value="mine">' + T({ vi: 'Của tôi', en: 'My Items' }) + '</option>';
    html += '<option value="team">' + T({ vi: 'Nhóm', en: 'Team' }) + '</option>';
    html += '<option value="all">' + T({ vi: 'Tất cả', en: 'All' }) + '</option>';
    html += '</select></div></div>';

    html += '<div class="eqms-inbox-categories">';
    var categories = [
      { key: 'pending_approval', label: { vi: 'Chờ phê duyệt', en: 'Pending Approval' }, icon: '\u{1F4DD}', accent: 'warning' },
      { key: 'pending_signature', label: { vi: 'Chờ ký', en: 'Pending Signature' }, icon: '\u270D\uFE0F', accent: 'danger' },
      { key: 'assigned_tasks', label: { vi: 'Nhiệm vụ được giao', en: 'Assigned Tasks' }, icon: '\u2611\uFE0F', accent: '' },
      { key: 'overdue_items', label: { vi: 'Mục quá hạn', en: 'Overdue Items' }, icon: '\u23F0', accent: 'danger' },
      { key: 'mentions', label: { vi: 'Đề cập', en: 'Mentions' }, icon: '\u{1F4AC}', accent: 'info' }
    ];
    categories.forEach(function(cat) {
      html += '<div class="eqms-inbox-category ' + cat.accent + '" data-action="inbox-filter" data-category="' + esc(cat.key) + '">';
      html += '<span class="eqms-inbox-category-icon">' + cat.icon + '</span>';
      html += '<span class="eqms-inbox-category-label">' + esc(T(cat.label)) + '</span>';
      html += '<span class="eqms-inbox-category-count" data-count="' + esc(cat.key) + '">—</span>';
      html += '</div>';
    });
    html += '</div>';

    html += '<div class="eqms-inbox-list" id="eqms-inbox-items">';
    html += renderLoadingState({ vi: 'Đang tải hộp thư...', en: 'Loading inbox...' });
    html += '</div></div>';

    if (container) container.innerHTML = html;
    return html;
  }

  // =========================================================================
  // BACKBONE 5: LINKED-RECORD GRAPH EXPLORER
  // =========================================================================
  function renderLinkedRecordGraph(links, config) {
    config = config || {};
    if (!links || !links.length) {
      return renderEmptyState({ icon: '\u{1F517}', title: { vi: 'Chưa có liên kết', en: 'No linked records' } });
    }

    var html = '<div class="eqms-linked-graph">';
    // View toggle
    html += '<div class="eqms-linked-graph-toolbar">';
    html += '<button class="eqms-btn ghost sm active" data-action="graph-view" data-mode="list">' + T({ vi: 'Danh sách', en: 'List' }) + '</button>';
    html += '<button class="eqms-btn ghost sm" data-action="graph-view" data-mode="tree">' + T({ vi: 'Cây', en: 'Tree' }) + '</button>';
    html += '</div>';

    // Group links by semantic type
    var grouped = {};
    links.forEach(function(l) {
      var lt = l.link_type || l.relationship || 'related-to';
      if (!grouped[lt]) grouped[lt] = [];
      grouped[lt].push(l);
    });

    // Render grouped view
    html += '<div class="eqms-linked-graph-content">';
    Object.keys(grouped).forEach(function(lt) {
      var linkDef = LINK_TYPES[lt] || LINK_TYPES['related-to'];
      html += '<div class="eqms-linked-group">';
      html += '<div class="eqms-linked-group-header" style="border-left:3px solid ' + linkDef.color + '">';
      html += '<span>' + linkDef.arrow + ' ' + esc(T(linkDef.label)) + '</span>';
      html += '<span class="eqms-badge">' + grouped[lt].length + '</span>';
      html += '</div>';
      grouped[lt].forEach(function(l) {
        var entityType = l.entity_type || l.type || '';
        var entityDef = ENTITY_MODEL[entityType] || {};
        html += '<div class="eqms-linked-item" data-action="open-linked" data-type="' + esc(entityType) + '" data-id="' + esc(l.target_id || l.id || '') + '">';
        html += '<span class="eqms-linked-item-icon" style="color:' + (entityDef.color || 'var(--eqms-entity-evidence,#64748b)') + '">' + (entityDef.icon || '\u{1F517}') + '</span>';
        html += '<div class="eqms-linked-item-info">';
        html += '<span class="eqms-linked-item-type">' + esc(T(entityDef.label || { en: entityType })) + '</span>';
        html += '<span class="eqms-linked-item-id">' + esc(l.target_id || l.record_id || l.id || '') + '</span>';
        if (l.title) html += '<span class="eqms-linked-item-title">' + esc(l.title) + '</span>';
        html += '</div>';
        if (l.status) html += '<span class="eqms-badge ' + slugify(l.status) + '">' + esc(l.status) + '</span>';
        html += '</div>';
      });
      html += '</div>';
    });
    html += '</div>';

    if (config.readonly !== true) {
      html += '<button class="eqms-btn ghost sm" data-action="link-record" style="margin-top:var(--eqms-gap-sm)">';
      html += '+ ' + T({ vi: 'Liên kết bản ghi', en: 'Link Record' });
      html += '</button>';
    }
    html += '</div>';
    return html;
  }

  // =========================================================================
  // BACKBONE 6: GLOBAL SEARCH
  // =========================================================================
  function renderGlobalSearch() {
    var html = '<div class="eqms-global-search">';
    html += '<div class="eqms-search-input-wrap">';
    html += '<span class="eqms-search-icon">\u{1F50D}</span>';
    html += '<input type="text" class="eqms-search-input" placeholder="' + T({ vi: 'Tìm kiếm EQMS... (NCR, CAPA, tài liệu, NCC...)', en: 'Search EQMS... (NCR, CAPA, documents, suppliers...)' }) + '" data-action="global-search">';
    html += '</div>';
    html += '<div class="eqms-search-results" id="eqms-search-results" style="display:none"></div>';
    html += '</div>';
    return html;
  }

  // =========================================================================
  // BACKBONE 7: ANALYTICS COMMAND CENTER DATA LAYER
  // =========================================================================
  var analyticsCache = {};

  function loadCommandCenterData(callback) {
    var pending = 0;
    var results = {};
    var endpoints = [
      { key: 'quality_tower', action: 'eqms_quality_tower_dashboard' },
      { key: 'overdue', action: 'eqms_quality_tower_overdue' }
    ];

    endpoints.forEach(function(ep) {
      pending++;
      apiCall(ep.action, {}).then(function(res) {
        results[ep.key] = res.success ? (res.data || {}) : null;
      }).catch(function() {
        results[ep.key] = null;
      }).finally(function() {
        pending--;
        if (pending === 0 && callback) {
          analyticsCache = results;
          callback(results);
        }
      });
    });
  }

  function renderCommandCenterStrip() {
    var html = '<div class="eqms-command-strip">';
    var items = [
      { key: 'open_ncr',     label: { vi: 'NCR mở',       en: 'Open NCRs' },       accent: 'danger' },
      { key: 'open_capa',    label: { vi: 'CAPA mở',      en: 'Open CAPAs' },       accent: 'warning' },
      { key: 'overdue',      label: { vi: 'Quá hạn',      en: 'Overdue' },          accent: 'danger' },
      { key: 'pending_sign', label: { vi: 'Chờ ký',       en: 'Pending Sign' },     accent: 'warning' },
      { key: 'complaints',   label: { vi: 'Khiếu nại',    en: 'Complaints' },       accent: '' },
      { key: 'audit_due',    label: { vi: 'Đánh giá sắp', en: 'Audits Due' },       accent: 'info' }
    ];
    items.forEach(function(item) {
      html += '<div class="eqms-command-item ' + item.accent + '" data-action="drill-kpi" data-kpi="' + esc(item.key) + '">';
      html += '<span class="eqms-command-label">' + esc(T(item.label)) + '</span>';
      html += '<span class="eqms-command-value" data-kpi-value="' + esc(item.key) + '">—</span>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  // =========================================================================
  // BACKBONE 8: CROSS-MODULE DRILL NAVIGATION
  // =========================================================================
  function drillToRecord(entityType, recordId, context) {
    var entityDef = ENTITY_MODEL[entityType];
    if (!entityDef || !entityDef.module) return;

    navigateToModule(entityDef.module, Object.assign({
      recordId: recordId,
      screen: 'detail',
      drillSource: context && context.sourceModule,
      drillEntity: entityType
    }, context || {}));
  }

  function resolveEntityLabel(entityType) {
    var def = ENTITY_MODEL[entityType];
    return def ? T(def.label) : entityType;
  }

  function resolveEntityIcon(entityType) {
    var def = ENTITY_MODEL[entityType];
    return def ? def.icon : '\u{1F4CB}';
  }

  function resolveEntityColor(entityType) {
    var def = ENTITY_MODEL[entityType];
    return def ? def.color : '#64748b';
  }

  // =========================================================================
  // REAL-TIME EVENTS ENGINE (SSE / polling fallback)
  // =========================================================================
  //
  // Usage (from any module):
  //   EqmsShell.events.subscribe('workflow', handler)   — attach handler
  //   EqmsShell.events.unsubscribe('workflow', handler) — detach handler
  //   EqmsShell.events.connect({ channels, modules, record_id })
  //   EqmsShell.events.disconnect()
  //
  // Handlers receive: { type, ...payload }
  // =========================================================================

  var _sseSource          = null;
  var _sseMode            = 'idle';      // 'idle' | 'stream' | 'polling'
  var _ssePollTimer       = null;
  var _sseRetryTimer      = null;
  var _sseRetryCount      = 0;
  var _sseMaxRetry        = 8;
  var _sseOptions         = {};
  var _sseHandlers        = {};          // eventType -> [fn, fn, ...]
  var _sseGlobalHandlers  = [];          // called for every event

  var SSE_RETRY_DELAYS = [1000, 2000, 4000, 8000, 15000, 30000, 60000, 120000];

  function sseConnect(options) {
    options = options || {};
    _sseOptions = options;
    _sseRetryCount = 0;
    _sseDisconnect();
    _sseOpen();
  }

  function sseDisconnect() {
    _sseRetryCount = _sseMaxRetry; // prevent auto-reconnect
    _sseDisconnect();
  }

  function _sseDisconnect() {
    if (_ssePollTimer) { clearInterval(_ssePollTimer); _ssePollTimer = null; }
    if (_sseRetryTimer) { clearTimeout(_sseRetryTimer); _sseRetryTimer = null; }
    if (_sseSource) {
      _sseSource.close();
      _sseSource = null;
    }
    _sseMode = 'idle';
  }

  function _sseOpen() {
    if (typeof EventSource === 'undefined') {
      _sseStartPolling();
      return;
    }

    var params = 'channels=' + encodeURIComponent((_sseOptions.channels || 'workflow,notifications'));
    if (_sseOptions.modules)   params += '&modules='   + encodeURIComponent(_sseOptions.modules);
    if (_sseOptions.record_id) params += '&record_id=' + encodeURIComponent(_sseOptions.record_id);

    var url = 'api/index.php?action=eqms_events_stream&' + params;
    // Direct REST endpoint (preferred when router supports it)
    if (window.location && window.location.pathname) {
      url = '/api/v1/eqms/events/stream?' + params;
    }

    try {
      var src = new EventSource(url, { withCredentials: true });

      src.addEventListener('connected', function(e) {
        _sseRetryCount = 0;
        var data = JSON.parse(e.data || '{}');
        _sseMode = data.mode === 'polling' ? 'polling' : 'stream';
        if (_sseMode === 'polling') {
          src.close();
          _sseSource = null;
          _sseStartPolling(data.poll_interval || 60);
        } else {
          _sseMode = 'stream';
        }
        _sseDispatch('connected', data);
      });

      src.addEventListener('reconnect', function(e) {
        var data = JSON.parse(e.data || '{}');
        if (data.retry) src.dispatchEvent; // EventSource handles retry natively
        _sseDispatch('reconnect', data);
      });

      src.addEventListener('error', function(e) {
        _sseDispatch('error', { source: 'sse', readyState: src.readyState });
      });

      // Catch-all for unnamed 'message' events (fallback)
      src.onmessage = function(e) {
        try {
          var payload = JSON.parse(e.data);
          _sseDispatch(payload.type || 'message', payload);
        } catch(err) {}
      };

      // Named event types from the server
      var sseEventTypes = [
        'workflow.transitioned', 'notification.new', 'dashboard.updated',
        'mes.state_changed', 'dispatch.updated', 'ai.prediction.quality',
        'record.updated', 'comment.added', 'attachment.added',
        'assignment.changed', 'metric.refresh', 'error'
      ];
      sseEventTypes.forEach(function(type) {
        src.addEventListener(type, function(e) {
          try {
            var payload = JSON.parse(e.data);
            _sseDispatch(type, payload);
          } catch(err) {}
        });
      });

      src.onerror = function() {
        if (src.readyState === EventSource.CLOSED) {
          _sseSource = null;
          _sseMode = 'idle';
          _sseScheduleRetry();
        }
      };

      _sseSource = src;
      _sseMode = 'stream';
    } catch(err) {
      _sseStartPolling();
    }
  }

  function _sseScheduleRetry() {
    if (_sseRetryTimer) clearTimeout(_sseRetryTimer);
    if (_sseRetryCount >= _sseMaxRetry) {
      _sseStartPolling(120);
      return;
    }
    var delay = SSE_RETRY_DELAYS[Math.min(_sseRetryCount, SSE_RETRY_DELAYS.length - 1)];
    _sseRetryCount++;
    _sseRetryTimer = setTimeout(function() { _sseOpen(); }, delay);
  }

  function _sseStartPolling(intervalSeconds) {
    _sseMode = 'polling';
    var ms = (intervalSeconds || 60) * 1000;
    if (_ssePollTimer) clearInterval(_ssePollTimer);
    _ssePollTimer = setInterval(function() {
      _ssePollTick();
    }, ms);
  }

  function _ssePollTick() {
    var channels = (_sseOptions.channels || 'workflow,notifications').split(',');
    var needsWorkflow = channels.indexOf('workflow') >= 0 || channels.indexOf('all') >= 0;
    var needsDashboard = channels.indexOf('dashboard') >= 0 || channels.indexOf('all') >= 0;
    if (needsDashboard && typeof loadCommandCenterData === 'function') {
      loadCommandCenterData();
    }
    _sseDispatch('poll.tick', { ts: Date.now(), channels: channels });
  }

  function sseSubscribe(eventType, handler) {
    if (eventType === '*') {
      if (_sseGlobalHandlers.indexOf(handler) < 0) _sseGlobalHandlers.push(handler);
      return;
    }
    if (!_sseHandlers[eventType]) _sseHandlers[eventType] = [];
    if (_sseHandlers[eventType].indexOf(handler) < 0) _sseHandlers[eventType].push(handler);
  }

  function sseUnsubscribe(eventType, handler) {
    if (eventType === '*') {
      _sseGlobalHandlers = _sseGlobalHandlers.filter(function(h) { return h !== handler; });
      return;
    }
    if (_sseHandlers[eventType]) {
      _sseHandlers[eventType] = _sseHandlers[eventType].filter(function(h) { return h !== handler; });
    }
  }

  function _sseDispatch(eventType, payload) {
    var event = Object.assign({ type: eventType }, payload);
    // Type-specific handlers
    var handlers = _sseHandlers[eventType] || [];
    handlers.forEach(function(h) { try { h(event); } catch(e) {} });
    // Wildcard handlers
    _sseGlobalHandlers.forEach(function(h) { try { h(event); } catch(e) {} });
    // Workflow transitions auto-refresh the active module's queue
    if (eventType === 'workflow.transitioned' && window.EqmsShell && typeof window.EqmsShell.onLiveEvent === 'function') {
      window.EqmsShell.onLiveEvent(event);
    }
  }

  function sseGetMode() { return _sseMode; }

  // =========================================================================
  // PUBLIC API
  // =========================================================================
  window.EqmsModules = window.EqmsModules || {};
  window.EqmsShell = {
    render: render,
    navigate: navigateToModule,
    drillToRecord: drillToRecord,
    modules: MODULES,
    groups: GROUPS,
    // Canonical entity model
    entityModel: ENTITY_MODEL,
    linkTypes: LINK_TYPES,
    errorStates: ERROR_STATES,
    // Entity helpers
    resolveEntityLabel: resolveEntityLabel,
    resolveEntityIcon: resolveEntityIcon,
    resolveEntityColor: resolveEntityColor,
    classifyError: classifyError,
    // Analytics
    loadCommandCenterData: loadCommandCenterData,
    // Shared components for use by child modules
    ui: {
      renderIdentityHeader: renderIdentityHeader,
      renderStateTimeline: renderStateTimeline,
      renderAuditTrail: renderAuditTrail,
      renderSignaturePanel: renderSignaturePanel,
      renderCommentsThread: renderCommentsThread,
      renderAttachmentsGrid: renderAttachmentsGrid,
      renderRelationshipsPanel: renderRelationshipsPanel,
      renderLinkedRecordGraph: renderLinkedRecordGraph,
      renderFilterBar: renderFilterBar,
      renderDataGrid: renderDataGrid,
      renderKpiRow: renderKpiRow,
      renderExportMenu: renderExportMenu,
      renderEmptyState: renderEmptyState,
      renderLoadingState: renderLoadingState,
      renderErrorState: renderErrorState,
      renderRichErrorState: renderRichErrorState,
      renderWizardShell: renderWizardShell,
      renderTabs: renderTabs,
      renderChartWithTableFallback: renderChartWithTableFallback,
      renderPagination: renderPagination,
      renderSection: renderSection,
      renderFieldGrid: renderFieldGrid,
      renderFormField: renderFormField,
      renderWizardField: renderFormField,
      renderBreadcrumb: renderBreadcrumb,
      renderGlobalInbox: renderGlobalInbox,
      renderGlobalSearch: renderGlobalSearch,
      renderCommandCenterStrip: renderCommandCenterStrip
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
      apiCallEnhanced: apiCallEnhanced,
      loadReferenceOptions: loadReferenceOptions,
      hydrateReferenceControls: hydrateReferenceControls,
      inferReferenceKey: inferReferenceKey,
      normalizeApiResponse: normalizeApiResponse,
      invalidateGetCache: invalidateGetCache,
      lang: _lang
    },
    // Real-time SSE event engine
    events: {
      connect:     sseConnect,
      disconnect:  sseDisconnect,
      subscribe:   sseSubscribe,
      unsubscribe: sseUnsubscribe,
      mode:        sseGetMode
    },
    // Called by _sseDispatch for workflow transitions — modules can override
    onLiveEvent: null
  };

  // Register with portal router
  window._renderEqmsSuite = render;
})();
