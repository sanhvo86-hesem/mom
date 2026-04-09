/* ===================================================================
   13-master-data-control.js -- Governed Master Data Control
   HESEM MOM Portal -- Customer / Supplier / Part / Revision / CAPA / Work Center / Machine / Operator / MES reason codes
   Shared source for Order Management, Evidence Control, and MES runtime lookups
   =================================================================== */

(function(){
'use strict';

var _mdCache = null;
var _mdPromise = null;
var _mdState = {
  entity: 'customers',
  entitySearch: '',
  search: '',
  selectedId: '',
  draft: null
};

var ENTITY_CONFIG = {
  customers: {
    key: 'customer_id',
    labelVi: 'Khách hàng',
    labelEn: 'Customers',
    emptyVi: 'Chưa có khách hàng nào.',
    listColumns: [
      { key:'customer_id', label:'Mã' },
      { key:'customer_name', label:'Tên khách hàng' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'customer_id', type:'text', required:true, label:'Mã khách hàng' },
      { key:'customer_name', type:'text', required:true, label:'Tên khách hàng' },
      { key:'customer_name_vi', type:'text', label:'Tên tiếng Việt' },
      { key:'customer_type', type:'select', required:true, label:'Loại khách hàng', optionSet:'customer_type' },
      { key:'status', type:'select', required:true, label:'Trạng thái', optionSet:'active_inactive_blocked' },
      { key:'contact_name', type:'text', label:'Người liên hệ' },
      { key:'contact_email', type:'email', label:'Email liên hệ' },
      { key:'site_code', type:'text', label:'Mã site / plant' }
    ]
  },
  suppliers: {
    key: 'supplier_id',
    labelVi: 'Nhà cung cấp',
    labelEn: 'Suppliers',
    emptyVi: 'Chưa có nhà cung cấp nào.',
    listColumns: [
      { key:'supplier_id', label:'Mã' },
      { key:'supplier_name', label:'Tên nhà cung cấp' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'supplier_id', type:'text', required:true, label:'Mã nhà cung cấp' },
      { key:'supplier_name', type:'text', required:true, label:'Tên nhà cung cấp' },
      { key:'supplier_name_vi', type:'text', label:'Tên tiếng Việt' },
      { key:'supplier_type', type:'select', required:true, label:'Loại', optionSet:'supplier_type' },
      { key:'status', type:'select', required:true, label:'Trạng thái', optionSet:'approved_conditional_blocked_inactive' },
      { key:'approved_customers', type:'text', label:'Khách hàng áp dụng', helper:'Nhập danh sách mã khách hàng, phân tách bằng dấu phẩy.' },
      { key:'contact_name', type:'text', label:'Người liên hệ' },
      { key:'contact_email', type:'email', label:'Email liên hệ' }
    ]
  },
  parts: {
    key: 'part_number',
    labelVi: 'Part number',
    labelEn: 'Parts',
    emptyVi: 'Chưa có part number nào.',
    listColumns: [
      { key:'part_number', label:'Part Number' },
      { key:'part_description', label:'Mô tả' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'part_number', type:'text', required:true, label:'Part Number' },
      { key:'part_description', type:'text', required:true, label:'Mô tả chi tiết' },
      { key:'customer_id', type:'lookup', entity:'customers', required:true, label:'Khách hàng' },
      { key:'status', type:'select', required:true, label:'Trạng thái', optionSet:'active_inactive_obsolete' },
      { key:'preferred_supplier_id', type:'lookup', entity:'suppliers', label:'Nhà cung cấp ưu tiên' },
      { key:'traceability_level', type:'select', label:'Mức truy xuất vật liệu', optionSet:'traceability_level' },
      { key:'material_trace_required', type:'select', label:'Bắt buộc trace vật liệu', optionSet:'yes_no' },
      { key:'required_trace_fields', type:'text', label:'Trường trace bắt buộc', helper:'Ví dụ: material_lot_number, heat_number, traveler_number, traveler_status, material_cert_status' }
    ]
  },
  revisions: {
    key: 'revision_id',
    labelVi: 'Revision',
    labelEn: 'Revisions',
    emptyVi: 'Chưa có revision nào.',
    listColumns: [
      { key:'revision_id', label:'Mã revision' },
      { key:'part_number', label:'Part Number' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'revision_id', type:'text', required:true, label:'Mã revision' },
      { key:'part_number', type:'lookup', entity:'parts', required:true, label:'Part Number' },
      { key:'revision', type:'text', required:true, label:'Revision' },
      { key:'status', type:'select', required:true, label:'Trạng thái', optionSet:'draft_released_superseded_obsolete' },
      { key:'release_date', type:'date', label:'Ngày phát hành' }
    ]
  },
  nc_program_releases: {
    key: 'program_id',
    labelVi: 'NC release',
    labelEn: 'NC releases',
    emptyVi: 'Chưa có chương trình NC nào được quản lý release.',
    listColumns: [
      { key:'program_id', label:'Mã chương trình' },
      { key:'part_number', label:'Part Number' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'program_id', type:'text', required:true, label:'Mã chương trình NC' },
      { key:'release_title', type:'text', required:true, label:'Tên release / tiêu đề' },
      { key:'part_number', type:'lookup', entity:'parts', required:true, label:'Part Number' },
      { key:'part_revision', type:'text', required:true, label:'Revision áp dụng' },
      { key:'operation_number', type:'number', required:true, label:'Operation number' },
      { key:'machine_type', type:'select', label:'Machine family', optionSet:'machine_family' },
      { key:'work_center_id', type:'lookup', entity:'work_centers', label:'Work center áp dụng' },
      { key:'cam_source_rev', type:'text', label:'CAM source revision' },
      { key:'post_processor_rev', type:'text', label:'Post-processor revision' },
      { key:'checksum', type:'text', label:'Checksum / fingerprint' },
      { key:'status', type:'select', required:true, label:'Trạng thái release', optionSet:'draft_released_superseded_blocked_obsolete' },
      { key:'released_at', type:'datetime-local', label:'Thời điểm release' },
      { key:'released_by', type:'text', label:'Người release' },
      { key:'notes', type:'textarea', label:'Ghi chú release', helper:'Ghi rõ phạm vi áp dụng, risk note hoặc handshake cần khóa tại máy.' }
    ]
  },
  mes_connectivity_adapters: {
    key: 'adapter_id',
    labelVi: 'Adapter kết nối MES',
    labelEn: 'MES connectivity adapters',
    emptyVi: 'Chưa có adapter kết nối MES nào.',
    listColumns: [
      { key:'adapter_id', label:'Adapter ID' },
      { key:'machine_id', label:'Máy' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'adapter_id', type:'text', required:true, label:'Adapter ID' },
      { key:'machine_id', type:'lookup', entity:'machines', required:true, label:'Máy áp dụng' },
      { key:'adapter_name', type:'text', required:true, label:'Tên adapter' },
      { key:'adapter_type', type:'select', required:true, label:'Loại adapter', optionSet:'adapter_type' },
      { key:'transport_protocol', type:'text', label:'Giao thức' },
      { key:'endpoint_url', type:'text', label:'Endpoint / URL' },
      { key:'heartbeat_sla_seconds', type:'number', label:'Heartbeat SLA (giây)' },
      { key:'stale_after_seconds', type:'number', label:'Ngưỡng stale (giây)' },
      { key:'auth_mode', type:'select', label:'Cơ chế xác thực', optionSet:'auth_mode' },
      { key:'store_and_forward_enabled', type:'select', label:'Store-and-forward', optionSet:'boolean_true_false' },
      { key:'payload_schema_version', type:'text', label:'Schema version' },
      { key:'status', type:'select', required:true, label:'Trạng thái', optionSet:'active_paused_retired' },
      { key:'last_validated_at', type:'datetime-local', label:'Lần xác nhận gần nhất' }
    ]
  },
  mes_alarm_catalog: {
    key: 'alarm_code',
    labelVi: 'Danh mục alarm MES',
    labelEn: 'MES alarm catalog',
    emptyVi: 'Chưa có alarm catalog nào.',
    listColumns: [
      { key:'alarm_code', label:'Alarm code' },
      { key:'title', label:'Alarm Title' },
      { key:'severity_default', label:'Severity' }
    ],
    fields: [
      { key:'alarm_code', type:'text', required:true, label:'Alarm code' },
      { key:'controller_family', type:'text', required:true, label:'Controller family' },
      { key:'alarm_group', type:'text', required:true, label:'Alarm group' },
      { key:'title', type:'text', required:true, label:'Tiêu đề tiếng Anh' },
      { key:'title_vi', type:'text', required:true, label:'Tiêu đề tiếng Việt' },
      { key:'severity_default', type:'select', required:true, label:'Mức độ mặc định', optionSet:'alarm_severity' },
      { key:'downtime_category_default', type:'select', label:'Nhóm downtime mặc định', optionSet:'downtime_category' },
      { key:'response_owner_role', type:'text', label:'Vai trò chịu trách nhiệm' },
      { key:'response_target_minutes', type:'number', label:'Mục tiêu phản ứng (phút)' },
      { key:'ack_required', type:'select', label:'Bắt buộc acknowledge', optionSet:'boolean_true_false' },
      { key:'ack_sla_minutes', type:'number', label:'SLA acknowledge (phút)' },
      { key:'escalation_sla_minutes', type:'number', label:'SLA escalation (phút)' },
      { key:'requires_lockout', type:'select', label:'Bắt buộc lockout', optionSet:'boolean_true_false' },
      { key:'requires_maintenance', type:'select', label:'Bắt buộc maintenance', optionSet:'boolean_true_false' },
      { key:'status', type:'select', required:true, label:'Trạng thái', optionSet:'active_inactive' }
    ]
  },
  mes_alarm_playbooks: {
    key: 'playbook_id',
    labelVi: 'Playbook alarm',
    labelEn: 'Alarm playbooks',
    emptyVi: 'Chưa có playbook alarm nào.',
    listColumns: [
      { key:'playbook_id', label:'Playbook ID' },
      { key:'alarm_code', label:'Alarm code' },
      { key:'title', label:'Playbook Title' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'playbook_id', type:'text', required:true, label:'Playbook ID' },
      { key:'alarm_code', type:'lookup', entity:'mes_alarm_catalog', required:true, label:'Alarm code' },
      { key:'title', type:'text', required:true, label:'Tiêu đề tiếng Anh' },
      { key:'title_vi', type:'text', required:true, label:'Tiêu đề tiếng Việt' },
      { key:'response_steps', type:'textarea', label:'Các bước phản ứng', helper:'Nhập mỗi bước trên một dòng; runtime sẽ tách thành danh sách.' },
      { key:'escalation_role', type:'text', label:'Vai trò escalatation' },
      { key:'acknowledge_within_minutes', type:'number', label:'Acknowledge trong (phút)' },
      { key:'response_target_minutes', type:'number', label:'Hoàn tất phản ứng trong (phút)' },
      { key:'lockout_release_required', type:'select', label:'Cần xác nhận release lockout', optionSet:'boolean_true_false' },
      { key:'status', type:'select', required:true, label:'Trạng thái', optionSet:'active_inactive' }
    ]
  },
  capas: {
    key: 'capa_number',
    labelVi: 'CAPA',
    labelEn: 'CAPA',
    emptyVi: 'Chưa có CAPA nào.',
    listColumns: [
      { key:'capa_number', label:'Số CAPA' },
      { key:'title', label:'Tiêu đề' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'capa_number', type:'text', required:true, label:'Số CAPA' },
      { key:'title', type:'text', required:true, label:'Tiêu đề' },
      { key:'status', type:'select', required:true, label:'Trạng thái', optionSet:'open_in_progress_closed_cancelled' },
      { key:'customer_id', type:'lookup', entity:'customers', label:'Khách hàng' },
      { key:'part_number', type:'lookup', entity:'parts', label:'Part Number' }
    ]
  },
  work_centers: {
    key: 'work_center_id',
    labelVi: 'Work center',
    labelEn: 'Work centers',
    emptyVi: 'Chưa có work center nào.',
    listColumns: [
      { key:'work_center_id', label:'Mã' },
      { key:'work_center_name', label:'Tên work center' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'work_center_id', type:'text', required:true, label:'Mã work center' },
      { key:'work_center_name', type:'text', required:true, label:'Tên work center' },
      { key:'department', type:'select', required:true, label:'Phòng ban', optionSet:'department_code_core' },
      { key:'process_family', type:'select', label:'Nhóm công nghệ', optionSet:'process_family' },
      { key:'area', type:'text', label:'Khu vực / line' },
      { key:'status', type:'select', required:true, label:'Trạng thái', optionSet:'active_inactive_blocked' }
    ]
  },
  machines: {
    key: 'machine_id',
    labelVi: 'Máy / thiết bị',
    labelEn: 'Machines',
    emptyVi: 'Chưa có máy hoặc thiết bị nào.',
    listColumns: [
      { key:'machine_id', label:'Mã máy' },
      { key:'machine_name', label:'Tên máy' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'machine_id', type:'text', required:true, label:'Mã máy' },
      { key:'machine_name', type:'text', required:true, label:'Tên máy' },
      { key:'work_center_id', type:'lookup', entity:'work_centers', required:true, label:'Work center' },
      { key:'machine_type', type:'select', required:true, label:'Loại máy', optionSet:'machine_type_legacy' },
      { key:'location', type:'text', label:'Vị trí máy' },
      { key:'telemetry_mode', type:'select', label:'Chế độ telemetry', optionSet:'telemetry_mode' },
      { key:'connector_type', type:'select', label:'Kiểu connector', optionSet:'connector_type' },
      { key:'connector_name', type:'text', label:'Tên connector' },
      { key:'connector_endpoint', type:'text', label:'Endpoint / adapter' },
      { key:'heartbeat_sla_seconds', type:'number', label:'Heartbeat SLA (giây)' },
      { key:'connector_required_for_release', type:'select', label:'Yêu cầu connector để release', optionSet:'yes_no' },
      { key:'manual_bridge_allowed', type:'select', label:'Cho phép manual bridge', optionSet:'yes_no' },
      { key:'preferred_operator_id', type:'lookup', entity:'operators', label:'Người vận hành ưu tiên' },
      { key:'status', type:'select', required:true, label:'Trạng thái', optionSet:'machine_runtime_status' },
      { key:'last_pm_date', type:'date', label:'Ngày PM gần nhất' },
      { key:'next_pm_date', type:'date', label:'Ngày PM tiếp theo' }
    ]
  },
  operators: {
    key: 'operator_id',
    labelVi: 'Nhân lực vận hành',
    labelEn: 'Operators',
    emptyVi: 'Chưa có nhân lực vận hành nào.',
    listColumns: [
      { key:'operator_id', label:'Mã' },
      { key:'operator_name', label:'Họ tên' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'operator_id', type:'text', required:true, label:'Mã nhân lực' },
      { key:'operator_name', type:'text', required:true, label:'Họ tên' },
      { key:'role', type:'select', required:true, label:'Vai trò', optionSet:'operator_role' },
      { key:'work_center_id', type:'lookup', entity:'work_centers', label:'Work center chính' },
      { key:'shift', type:'select', label:'Ca làm việc', optionSet:'shift_assignment' },
      { key:'skills', type:'text', label:'Kỹ năng / chứng nhận', helper:'Nhập các kỹ năng chính, phân tách bằng dấu phẩy.' },
      { key:'qualification_status', type:'select', label:'Trạng thái năng lực', optionSet:'qualification_status' },
      { key:'qualification_expiry', type:'date', label:'Ngày hết hạn năng lực' },
      { key:'qualified_machine_types', type:'text', label:'Machine family đủ chuẩn', helper:'Ví dụ: 5-axis, 3-axis, cmm' },
      { key:'qualified_machine_ids', type:'text', label:'Machine ID đủ chuẩn', helper:'Ví dụ: MC-5AX-01, CMM-01' },
      { key:'qualified_work_centers', type:'text', label:'Work center đủ chuẩn', helper:'Ví dụ: WC-5AX, WC-QA' },
      { key:'certified_processes', type:'text', label:'Quy trình đã chứng nhận', helper:'Ví dụ: setup, prove-out, final inspection' },
      { key:'status', type:'select', required:true, label:'Trạng thái', optionSet:'active_inactive_training_blocked' }
    ]
  },
  tooling_assets: {
    key: 'tool_id',
    labelVi: 'Dao / tooling',
    labelEn: 'Tooling assets',
    emptyVi: 'Chưa có dao hoặc tooling nào.',
    listColumns: [
      { key:'tool_id', label:'Mã tool' },
      { key:'tool_name', label:'Tên tooling' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'tool_id', type:'text', required:true, label:'Mã tooling' },
      { key:'tool_name', type:'text', required:true, label:'Tên tooling' },
      { key:'tool_type', type:'select', required:true, label:'Loại tooling', optionSet:'tooling_type' },
      { key:'machine_type', type:'select', label:'Machine family', optionSet:'machine_family' },
      { key:'preferred_work_center_id', type:'lookup', entity:'work_centers', label:'Work center ưu tiên' },
      { key:'life_limit_minutes', type:'number', label:'Giới hạn life (phút)' },
      { key:'life_limit_parts', type:'number', label:'Giới hạn life (số chi tiết)' },
      { key:'warning_pct', type:'number', label:'Ngưỡng cảnh báo (%)' },
      { key:'critical_pct', type:'number', label:'Ngưỡng tới hạn (%)' },
      { key:'default_offset_band_mm', type:'number', label:'Dải offset chuẩn (mm)' },
      { key:'status', type:'select', required:true, label:'Trạng thái', optionSet:'active_quarantine_retired' }
    ]
  },
  downtime_reason_codes: {
    key: 'reason_code',
    labelVi: 'Mã lý do downtime',
    labelEn: 'Downtime reason codes',
    emptyVi: 'Chưa có mã lý do downtime nào.',
    listColumns: [
      { key:'reason_code', label:'Mã lý do' },
      { key:'reason_name', label:'Reason Name' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'reason_code', type:'text', required:true, label:'Mã lý do' },
      { key:'reason_name', type:'text', required:true, label:'Tên tiếng Anh' },
      { key:'reason_name_vi', type:'text', required:true, label:'Tên tiếng Việt' },
      { key:'category', type:'select', required:true, label:'Nhóm downtime', optionSet:'downtime_category' },
      { key:'reason_group', type:'select', label:'Nhóm nguyên nhân', optionSet:'reason_group' },
      { key:'default_severity', type:'select', label:'Mức độ mặc định', optionSet:'default_severity' },
      { key:'planned_flag', type:'select', label:'Downtime có kế hoạch', optionSet:'no_yes' },
      { key:'escalation_sla_minutes', type:'number', label:'SLA escalation (phút)' },
      { key:'status', type:'select', required:true, label:'Trạng thái', optionSet:'active_inactive' }
    ]
  },
  downtime_resolution_codes: {
    key: 'resolution_code',
    labelVi: 'Mã khôi phục downtime',
    labelEn: 'Downtime resolution codes',
    emptyVi: 'Chưa có mã khôi phục downtime nào.',
    listColumns: [
      { key:'resolution_code', label:'Mã khôi phục' },
      { key:'resolution_name', label:'Resolution Name' },
      { key:'status', label:'Trạng thái' }
    ],
    fields: [
      { key:'resolution_code', type:'text', required:true, label:'Mã khôi phục' },
      { key:'resolution_name', type:'text', required:true, label:'Tên tiếng Anh' },
      { key:'resolution_name_vi', type:'text', required:true, label:'Tên tiếng Việt' },
      { key:'resolution_group', type:'select', label:'Nhóm xử lý', optionSet:'resolution_group' },
      { key:'status', type:'select', required:true, label:'Trạng thái', optionSet:'active_inactive' }
    ]
  }
};

Object.assign(ENTITY_CONFIG, {
  customer_sites: {
    key: 'site_id',
    labelVi: 'Site khách hàng',
    labelEn: 'Customer Sites',
    emptyVi: 'Chưa có customer site nào.',
    listColumns: [
      { key:'site_id', label:'Site ID' },
      { key:'site_name', label:'Site Name' },
      { key:'status', label:'Status' }
    ],
    fields: [
      { key:'site_id', type:'text', required:true, label:'Site ID' },
      { key:'customer_id', type:'lookup', entity:'customers', required:true, label:'Customer' },
      { key:'site_name', type:'text', required:true, label:'Site Name' },
      { key:'country_code', type:'text', label:'Country Code' },
      { key:'default_incoterm_code', type:'lookup', entity:'incoterms', label:'Default Incoterm' },
      { key:'default_shipping_method_id', type:'lookup', entity:'shipping_methods', label:'Default Shipping Method' },
      { key:'default_payment_term_code', type:'lookup', entity:'payment_terms', label:'Default Payment Term' },
      { key:'certificate_of_conformance_required', type:'select', label:'Certificate of Conformance Required', optionSet:'boolean_true_false' },
      { key:'certificate_of_analysis_required', type:'select', label:'Certificate of Analysis Required', optionSet:'boolean_true_false' },
      { key:'export_control_required', type:'select', label:'Export Control Required', optionSet:'boolean_true_false' },
      { key:'packing_spec_code', type:'text', label:'Packing Spec Code' },
      { key:'label_spec_code', type:'text', label:'Label Spec Code' },
      { key:'status', type:'select', required:true, label:'Status', optionSet:'draft_active_inactive_blocked_obsolete' }
    ]
  },
  commercial_accounts: {
    key: 'account_id',
    labelVi: 'Tài khoản thương mại',
    labelEn: 'Commercial Accounts',
    emptyVi: 'Chưa có commercial account nào.',
    listColumns: [
      { key:'account_id', label:'Account ID' },
      { key:'customer_id', label:'Customer' },
      { key:'status', label:'Status' }
    ],
    fields: [
      { key:'account_id', type:'text', required:true, label:'Account ID' },
      { key:'customer_id', type:'lookup', entity:'customers', required:true, label:'Customer' },
      { key:'account_owner', type:'lookup', entity:'operators', label:'Account Owner' },
      { key:'order_coordinator_role', type:'text', label:'Order Coordinator Role' },
      { key:'promise_policy_id', type:'lookup', entity:'promise_policies', label:'Promise Policy' },
      { key:'currency_code', type:'text', label:'Currency Code' },
      { key:'status', type:'select', required:true, label:'Status', optionSet:'draft_active_inactive_blocked_obsolete' }
    ]
  },
  incoterms: {
    key: 'incoterm_code',
    labelVi: 'Incoterm',
    labelEn: 'Incoterms',
    emptyVi: 'Chưa có incoterm nào.',
    listColumns: [
      { key:'incoterm_code', label:'Code' },
      { key:'incoterm_name', label:'Name' },
      { key:'status', label:'Status' }
    ],
    fields: [
      { key:'incoterm_code', type:'text', required:true, label:'Incoterm Code' },
      { key:'incoterm_name', type:'text', required:true, label:'Incoterm Name' },
      { key:'status', type:'select', required:true, label:'Status', optionSet:'active_inactive_obsolete' }
    ]
  },
  payment_terms: {
    key: 'payment_term_code',
    labelVi: 'Điều khoản thanh toán',
    labelEn: 'Payment Terms',
    emptyVi: 'Chưa có payment term nào.',
    listColumns: [
      { key:'payment_term_code', label:'Code' },
      { key:'payment_term_name', label:'Name' },
      { key:'status', label:'Status' }
    ],
    fields: [
      { key:'payment_term_code', type:'text', required:true, label:'Payment Term Code' },
      { key:'payment_term_name', type:'text', required:true, label:'Payment Term Name' },
      { key:'status', type:'select', required:true, label:'Status', optionSet:'active_inactive_obsolete' }
    ]
  },
  shipping_methods: {
    key: 'shipping_method_id',
    labelVi: 'Phương thức giao hàng',
    labelEn: 'Shipping Methods',
    emptyVi: 'Chưa có shipping method nào.',
    listColumns: [
      { key:'shipping_method_id', label:'Method ID' },
      { key:'shipping_method_name', label:'Method Name' },
      { key:'status', label:'Status' }
    ],
    fields: [
      { key:'shipping_method_id', type:'text', required:true, label:'Shipping Method ID' },
      { key:'shipping_method_name', type:'text', required:true, label:'Shipping Method Name' },
      { key:'mode', type:'select', label:'Mode', optionSet:'transport_mode' },
      { key:'status', type:'select', required:true, label:'Status', optionSet:'active_inactive_obsolete' }
    ]
  },
  promise_policies: {
    key: 'promise_policy_id',
    labelVi: 'Chính sách cam kết',
    labelEn: 'Promise Policies',
    emptyVi: 'Chưa có promise policy nào.',
    listColumns: [
      { key:'promise_policy_id', label:'Policy ID' },
      { key:'policy_name', label:'Policy Name' },
      { key:'status', label:'Status' }
    ],
    fields: [
      { key:'promise_policy_id', type:'text', required:true, label:'Promise Policy ID' },
      { key:'policy_name', type:'text', required:true, label:'Policy Name' },
      { key:'target_otd_percent', type:'number', label:'Target OTD %' },
      { key:'review_frequency', type:'select', label:'Review Frequency', optionSet:'review_frequency' },
      { key:'status', type:'select', required:true, label:'Status', optionSet:'active_inactive_obsolete' }
    ]
  },
  routing_library: {
    key: 'routing_id',
    labelVi: 'Routing',
    labelEn: 'Routing Library',
    emptyVi: 'Chưa có routing nào.',
    listColumns: [
      { key:'routing_id', label:'Routing ID' },
      { key:'part_number', label:'Part' },
      { key:'status', label:'Status' }
    ],
    fields: [
      { key:'routing_id', type:'text', required:true, label:'Routing ID' },
      { key:'part_number', type:'lookup', entity:'parts', required:true, label:'Part Number' },
      { key:'part_revision', type:'text', required:true, label:'Part Revision' },
      { key:'routing_name', type:'text', required:true, label:'Routing Name' },
      { key:'work_center_path', type:'text', label:'Work Center Path' },
      { key:'status', type:'select', required:true, label:'Status', optionSet:'draft_released_superseded_obsolete' }
    ]
  },
  bom_library: {
    key: 'bom_id',
    labelVi: 'BOM',
    labelEn: 'BOM Library',
    emptyVi: 'Chưa có BOM nào.',
    listColumns: [
      { key:'bom_id', label:'BOM ID' },
      { key:'part_number', label:'Part' },
      { key:'status', label:'Status' }
    ],
    fields: [
      { key:'bom_id', type:'text', required:true, label:'BOM ID' },
      { key:'part_number', type:'lookup', entity:'parts', required:true, label:'Part Number' },
      { key:'part_revision', type:'text', required:true, label:'Part Revision' },
      { key:'bom_name', type:'text', required:true, label:'BOM Name' },
      { key:'status', type:'select', required:true, label:'Status', optionSet:'draft_released_superseded_obsolete' }
    ]
  },
  control_plans: {
    key: 'control_plan_id',
    labelVi: 'Kế hoạch kiểm soát',
    labelEn: 'Control Plans',
    emptyVi: 'Chưa có control plan nào.',
    listColumns: [
      { key:'control_plan_id', label:'Control Plan ID' },
      { key:'part_number', label:'Part' },
      { key:'status', label:'Status' }
    ],
    fields: [
      { key:'control_plan_id', type:'text', required:true, label:'Control Plan ID' },
      { key:'part_number', type:'lookup', entity:'parts', required:true, label:'Part Number' },
      { key:'part_revision', type:'text', required:true, label:'Part Revision' },
      { key:'control_plan_name', type:'text', required:true, label:'Control Plan Name' },
      { key:'status', type:'select', required:true, label:'Status', optionSet:'draft_released_superseded_obsolete' }
    ]
  },
  inspection_plans: {
    key: 'inspection_plan_id',
    labelVi: 'Kế hoạch kiểm tra',
    labelEn: 'Inspection Plans',
    emptyVi: 'Chưa có inspection plan nào.',
    listColumns: [
      { key:'inspection_plan_id', label:'Inspection Plan ID' },
      { key:'part_number', label:'Part' },
      { key:'status', label:'Status' }
    ],
    fields: [
      { key:'inspection_plan_id', type:'text', required:true, label:'Inspection Plan ID' },
      { key:'part_number', type:'lookup', entity:'parts', required:true, label:'Part Number' },
      { key:'part_revision', type:'text', required:true, label:'Part Revision' },
      { key:'inspection_plan_name', type:'text', required:true, label:'Inspection Plan Name' },
      { key:'status', type:'select', required:true, label:'Status', optionSet:'draft_released_superseded_obsolete' }
    ]
  },
  traveler_templates: {
    key: 'traveler_template_id',
    labelVi: 'Mẫu traveler',
    labelEn: 'Traveler Templates',
    emptyVi: 'Chưa có traveler template nào.',
    listColumns: [
      { key:'traveler_template_id', label:'Traveler Template ID' },
      { key:'part_number', label:'Part' },
      { key:'status', label:'Status' }
    ],
    fields: [
      { key:'traveler_template_id', type:'text', required:true, label:'Traveler Template ID' },
      { key:'part_number', type:'lookup', entity:'parts', required:true, label:'Part Number' },
      { key:'part_revision', type:'text', required:true, label:'Part Revision' },
      { key:'traveler_template_name', type:'text', required:true, label:'Traveler Template Name' },
      { key:'status', type:'select', required:true, label:'Status', optionSet:'draft_released_superseded_obsolete' }
    ]
  },
  quality_gate_profiles: {
    key: 'quality_gate_profile_id',
    labelVi: 'Hồ sơ quality gate',
    labelEn: 'Quality Gate Profiles',
    emptyVi: 'Chưa có quality gate profile nào.',
    listColumns: [
      { key:'quality_gate_profile_id', label:'Profile ID' },
      { key:'profile_name', label:'Profile Name' },
      { key:'status', label:'Status' }
    ],
    fields: [
      { key:'quality_gate_profile_id', type:'text', required:true, label:'Quality Gate Profile ID' },
      { key:'profile_name', type:'text', required:true, label:'Profile Name' },
      { key:'required_gates', type:'textarea', label:'Required Gates', helper:'Nhập danh sách gate, phân tách bằng dấu phẩy hoặc mỗi gate một dòng.' },
      { key:'status', type:'select', required:true, label:'Status', optionSet:'active_inactive_obsolete' }
    ]
  },
  launch_gate_templates: {
    key: 'gate_template_id',
    labelVi: 'Mẫu launch gate',
    labelEn: 'Launch Gate Templates',
    emptyVi: 'Chưa có launch gate template nào.',
    listColumns: [
      { key:'gate_template_id', label:'Gate Template ID' },
      { key:'work_center_id', label:'Work Center' },
      { key:'status', label:'Status' }
    ],
    fields: [
      { key:'gate_template_id', type:'text', required:true, label:'Gate Template ID' },
      { key:'work_center_id', type:'lookup', entity:'work_centers', required:true, label:'Work Center' },
      { key:'gate_name', type:'text', required:true, label:'Gate Name' },
      { key:'required_gates', type:'textarea', label:'Required Gates', helper:'Nhập danh sách gate, phân tách bằng dấu phẩy hoặc mỗi gate một dòng.' },
      { key:'status', type:'select', required:true, label:'Status', optionSet:'active_inactive_obsolete' }
    ]
  },
  customer_item_approvals: {
    key: 'approval_id',
    labelVi: 'Phê duyệt item khách hàng',
    labelEn: 'Customer Item Approvals',
    emptyVi: 'Chưa có customer item approval nào.',
    listColumns: [
      { key:'approval_id', label:'Approval ID' },
      { key:'customer_id', label:'Customer' },
      { key:'status', label:'Status' }
    ],
    fields: [
      { key:'approval_id', type:'text', required:true, label:'Approval ID' },
      { key:'customer_id', type:'lookup', entity:'customers', required:true, label:'Customer' },
      { key:'part_number', type:'lookup', entity:'parts', required:true, label:'Part Number' },
      { key:'part_revision', type:'text', required:true, label:'Part Revision' },
      { key:'approved_for_production', type:'select', required:true, label:'Approved for Production', optionSet:'boolean_true_false' },
      { key:'status', type:'select', required:true, label:'Status', optionSet:'active_inactive_obsolete' }
    ]
  },
  supplier_process_approvals: {
    key: 'approval_id',
    labelVi: 'Phê duyệt quy trình NCC',
    labelEn: 'Supplier Process Approvals',
    emptyVi: 'Chưa có supplier process approval nào.',
    listColumns: [
      { key:'approval_id', label:'Approval ID' },
      { key:'supplier_id', label:'Supplier' },
      { key:'status', label:'Status' }
    ],
    fields: [
      { key:'approval_id', type:'text', required:true, label:'Approval ID' },
      { key:'supplier_id', type:'lookup', entity:'suppliers', required:true, label:'Supplier' },
      { key:'customer_id', type:'lookup', entity:'customers', required:true, label:'Customer' },
      { key:'special_process', type:'text', required:true, label:'Special Process' },
      { key:'status', type:'select', required:true, label:'Status', optionSet:'approved_conditional_blocked_inactive' }
    ]
  },
  warehouse_locations: {
    key: 'warehouse_id',
    labelVi: 'Kho / vị trí kho',
    labelEn: 'Warehouse Locations',
    emptyVi: 'Chưa có warehouse location nào.',
    listColumns: [
      { key:'warehouse_id', label:'Warehouse ID' },
      { key:'warehouse_name', label:'Warehouse Name' },
      { key:'status', label:'Status' }
    ],
    fields: [
      { key:'warehouse_id', type:'text', required:true, label:'Warehouse ID' },
      { key:'warehouse_name', type:'text', required:true, label:'Warehouse Name' },
      { key:'warehouse_type', type:'select', label:'Warehouse Type', optionSet:'warehouse_type' },
      { key:'status', type:'select', required:true, label:'Status', optionSet:'draft_active_inactive_obsolete' }
    ]
  },
  defect_catalog: {
    key: 'defect_code',
    labelVi: 'Danh mục lỗi',
    labelEn: 'Defect Catalog',
    emptyVi: 'Chưa có defect catalog nào.',
    listColumns: [
      { key:'defect_code', label:'Defect Code' },
      { key:'defect_name', label:'Defect Name' },
      { key:'status', label:'Status' }
    ],
    fields: [
      { key:'defect_code', type:'text', required:true, label:'Defect Code' },
      { key:'defect_name', type:'text', required:true, label:'Defect Name' },
      { key:'defect_name_vi', type:'text', label:'Tên tiếng Việt' },
      { key:'defect_group', type:'select', label:'Defect Group', optionSet:'defect_group' },
      { key:'severity_default', type:'select', label:'Default Severity', optionSet:'default_severity' },
      { key:'status', type:'select', required:true, label:'Status', optionSet:'draft_active_inactive_obsolete' }
    ]
  }
});

var ENTITY_LABEL_FIELD = {
  customers: 'customer_name',
  customer_sites: 'site_name',
  commercial_accounts: 'account_id',
  suppliers: 'supplier_name',
  parts: 'part_number',
  revisions: 'revision_id',
  incoterms: 'incoterm_name',
  payment_terms: 'payment_term_name',
  shipping_methods: 'shipping_method_name',
  promise_policies: 'policy_name',
  routing_library: 'routing_name',
  bom_library: 'bom_name',
  control_plans: 'control_plan_name',
  inspection_plans: 'inspection_plan_name',
  traveler_templates: 'traveler_template_name',
  quality_gate_profiles: 'profile_name',
  launch_gate_templates: 'gate_name',
  customer_item_approvals: 'approval_id',
  supplier_process_approvals: 'approval_id',
  warehouse_locations: 'warehouse_name',
  nc_program_releases: 'release_title',
  capas: 'title',
  work_centers: 'work_center_name',
  machines: 'machine_name',
  operators: 'operator_name',
  tooling_assets: 'tool_name',
  downtime_reason_codes: 'reason_name',
  downtime_resolution_codes: 'resolution_name',
  mes_connectivity_adapters: 'adapter_name',
  mes_alarm_catalog: 'title',
  mes_alarm_playbooks: 'title',
  defect_catalog: 'defect_name'
};

var ENTITY_DEFAULTS = {
  customer_sites: { status:'active', certificate_of_conformance_required:'true', certificate_of_analysis_required:'true', export_control_required:'false' },
  commercial_accounts: { status:'active', currency_code:'USD' },
  incoterms: { status:'active' },
  payment_terms: { status:'active' },
  shipping_methods: { status:'active', mode:'air' },
  promise_policies: { status:'active', review_frequency:'weekly' },
  routing_library: { status:'released' },
  bom_library: { status:'released' },
  control_plans: { status:'released' },
  inspection_plans: { status:'released' },
  traveler_templates: { status:'released' },
  quality_gate_profiles: { status:'active' },
  launch_gate_templates: { status:'active' },
  customer_item_approvals: { status:'active', approved_for_production:'true' },
  supplier_process_approvals: { status:'approved' },
  warehouse_locations: { status:'active' },
  defect_catalog: { status:'active', severity_default:'major' }
};

function _t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }
function _escHtml(value){ var d = document.createElement('div'); d.appendChild(document.createTextNode(String(value || ''))); return d.innerHTML; }
function _clone(obj){ return JSON.parse(JSON.stringify(obj || {})); }
function _toast(message, type){ if(typeof showToast === 'function') return showToast(message, type); if(window.console) console.log('[mdc]', message); }

function _api(action, payload, method){
  if(typeof apiCall === 'function') return apiCall(action, payload || {}, method || 'POST');
  var url = 'api.php?action=' + encodeURIComponent(action);
  var opts = { method: method || 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } };
  if(typeof csrfToken !== 'undefined' && csrfToken) opts.headers['X-CSRF-Token'] = csrfToken;
  if(opts.method !== 'GET') opts.body = JSON.stringify(payload || {});
  return fetch(url, opts).then(function(r){ return r.json(); });
}

function _injectStyles(){
  if(document.getElementById('mdc-styles')) return;
  var style = document.createElement('style');
  style.id = 'mdc-styles';
  style.textContent = [
    '.mdc-overlay{position:fixed;inset:0;background:rgba(15,23,42,.46);backdrop-filter:blur(6px);z-index:12000;display:flex;align-items:center;justify-content:center;padding:24px}',
    '.mdc-shell{width:min(1240px,96vw);height:min(86vh,880px);background:var(--bg-surface,#fff);border-radius:24px;overflow:hidden;box-shadow:0 30px 80px rgba(12,45,72,.24);display:grid;grid-template-rows:auto 1fr}',
    '.mdc-header{display:flex;align-items:flex-end;justify-content:space-between;padding:24px 28px 18px;background:linear-gradient(135deg,#0c2d48 0%,#15466f 58%,#1d5e96 100%);color:var(--text-inverse,#fff)}',
    '.mdc-title{font-size:1.5rem;font-weight:700;letter-spacing:.01em}.mdc-subtitle{font-size:.9rem;color:rgba(255,255,255,.76);margin-top:4px}.mdc-close{border:none;background:rgba(255,255,255,.08);color:var(--text-inverse,#fff);width:42px;height:42px;border-radius:12px;cursor:pointer;font-size:18px}',
    '.mdc-body{display:grid;grid-template-columns:220px minmax(0,1fr) 360px;min-height:0}.mdc-rail{border-right:1px solid var(--border,#e2e8f0);background:var(--bg-surface-alt,#f8fafc);padding:18px 14px 18px 18px;overflow:auto}.mdc-list{padding:20px 22px;overflow:auto;background:var(--bg-surface,#fff)}.mdc-editor{border-left:1px solid var(--border,#e2e8f0);background:#fcfdff;display:flex;flex-direction:column;min-height:0}',
    '.mdc-rail-title{font-size:.73rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-secondary,#64748b);margin-bottom:14px}.mdc-entity-search{width:100%;height:40px;border:1px solid var(--border,#d9e2ec);border-radius:12px;padding:0 12px;background:var(--bg-surface,#fff);margin-bottom:14px}.mdc-entity-btn{width:100%;text-align:left;border:none;background:transparent;border-radius:16px;padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:all .16s ease;color:var(--text-primary,#1e293b)}.mdc-entity-btn:hover{background:#eef4fb}.mdc-entity-btn.active{background:#e8f1fb;box-shadow:inset 0 0 0 1px rgba(21,101,192,.16)}.mdc-entity-name{display:block;font-weight:700;font-size:.95rem}.mdc-entity-meta{display:block;font-size:.76rem;color:var(--text-secondary,#64748b);margin-top:4px}',
    '.mdc-toolbar{display:flex;gap:12px;align-items:center;justify-content:space-between;margin-bottom:16px}.mdc-search{flex:1;max-width:340px;height:42px;border:1px solid var(--border,#d9e2ec);border-radius:14px;padding:0 14px;background:var(--bg-surface,#fff)}.mdc-search:focus,.mdc-input:focus,.mdc-select:focus,.mdc-textarea:focus,.mdc-entity-search:focus{outline:none;border-color:var(--brand-2,#1565c0);box-shadow:0 0 0 3px rgba(21,101,192,.12)}',
    '.mdc-btn{height:42px;border:none;border-radius:14px;padding:0 16px;cursor:pointer;font-weight:700}.mdc-btn-primary{background:var(--brand-2,#1565c0);color:var(--text-inverse,#fff)}.mdc-btn-ghost{background:#eef2f7;color:var(--text-secondary,#334155)}',
    '.mdc-grid{border:1px solid var(--border,#e2e8f0);border-radius:18px;overflow:hidden}.mdc-grid-head,.mdc-grid-row{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1.4fr) minmax(0,1fr);align-items:center}.mdc-grid-head{background:var(--bg-surface-alt,#f8fafc);font-size:.73rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--text-secondary,#64748b)}.mdc-grid-head>div,.mdc-grid-row>div{padding:12px 14px;border-bottom:1px solid var(--border,#edf2f7);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mdc-grid-row{cursor:pointer;font-size:.9rem}.mdc-grid-row:hover{background:#f8fbff}.mdc-grid-row.active{background:#eef5ff}.mdc-empty{padding:26px 18px;color:var(--text-secondary,#64748b);font-size:.92rem}',
    '.mdc-editor-head{padding:20px 22px 12px;border-bottom:1px solid var(--border,#e2e8f0)}.mdc-editor-title{font-size:1rem;font-weight:800;color:var(--text-primary,#0f172a)}.mdc-editor-sub{font-size:.82rem;color:var(--text-secondary,#64748b);margin-top:4px}.mdc-editor-body{padding:18px 22px 24px;overflow:auto}',
    '.mdc-field{margin-bottom:14px}.mdc-label{display:block;font-size:.8rem;font-weight:700;color:var(--text-secondary,#334155);margin-bottom:6px}.mdc-helper{display:block;font-size:.72rem;color:var(--text-secondary,#64748b);margin-top:6px}.mdc-input,.mdc-select{width:100%;height:40px;border:1px solid var(--border,#d9e2ec);border-radius:12px;padding:0 12px;background:var(--bg-surface,#fff)}.mdc-textarea{width:100%;min-height:88px;border:1px solid var(--border,#d9e2ec);border-radius:12px;padding:10px 12px;background:var(--bg-surface,#fff);resize:vertical}.mdc-footer{display:flex;gap:10px;justify-content:flex-end;padding-top:8px}',
    '.mdc-pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;background:#eef4fb;color:#31537c;font-size:.74rem;font-weight:700}',
    '@media (max-width:1100px){.mdc-body{grid-template-columns:190px minmax(0,1fr)}.mdc-editor{grid-column:1 / -1;border-left:none;border-top:1px solid var(--border,#e2e8f0)}}',
    '@media (max-width:760px){.mdc-overlay{padding:10px}.mdc-shell{width:100%;height:92vh;border-radius:18px}.mdc-body{grid-template-columns:1fr}.mdc-rail{border-right:none;border-bottom:1px solid var(--border,#e2e8f0)}.mdc-grid-head,.mdc-grid-row{grid-template-columns:1.15fr 1.35fr .9fr}}'
  ].join('\n');
  document.head.appendChild(style);
}

function _getEntityRows(entity){ return (_mdCache && Array.isArray(_mdCache[entity])) ? _mdCache[entity] : []; }
function _normalizeText(value){ return String(value || '').toLowerCase(); }
function _matchesSearch(item, query){ if(!query) return true; var hay = Object.keys(item || {}).map(function(key){ return _normalizeText(item[key]); }).join(' '); return hay.indexOf(query) >= 0; }

function _optionLabel(entity, row){
  if(!row) return '';
  var configured = ENTITY_LABEL_FIELD[entity];
  if(configured && row[configured]) return row[configured];
  if(entity === 'customers') return row.customer_name || row.customer_id || '';
  if(entity === 'suppliers') return row.supplier_name || row.supplier_id || '';
  if(entity === 'parts') return row.part_number || '';
  if(entity === 'revisions') return row.revision_id || row.revision || '';
  if(entity === 'nc_program_releases') return row.program_id || '';
  if(entity === 'capas') return row.capa_number || '';
  if(entity === 'work_centers') return row.work_center_name || row.work_center_id || '';
  if(entity === 'machines') return row.machine_name || row.machine_id || '';
  if(entity === 'operators') return row.operator_name || row.operator_id || '';
  if(entity === 'tooling_assets') return row.tool_name || row.tool_id || '';
  if(entity === 'downtime_reason_codes') return row.reason_name_vi || row.reason_name || row.reason_code || '';
  if(entity === 'downtime_resolution_codes') return row.resolution_name_vi || row.resolution_name || row.resolution_code || '';
  return '';
}

function _lookupOptions(entity){
  var cfg = ENTITY_CONFIG[entity];
  if(!cfg) return [];
  return _getEntityRows(entity).map(function(row){
    var value = row[cfg.key];
    return { value:value, label:_optionLabel(entity, row) };
  });
}

function _fieldOptions(field, value){
  var opts = [];
  var currentValue = value == null ? '' : String(value);
  if(window.HmRegistry && typeof HmRegistry.selectOptions === 'function'){
    opts = HmRegistry.selectOptions({ field:field || {} }) || [];
  }
  if((!opts || !opts.length) && Array.isArray(field && field.options)){
    opts = field.options.map(function(opt){ return { value:opt, label:opt, labelEn:opt }; });
  }
  if(currentValue && opts && opts.length && !opts.some(function(opt){ return String(opt.value) === currentValue; })){
    opts = opts.slice();
    opts.push({ value:currentValue, label:currentValue, labelEn:currentValue });
  }
  return opts || [];
}

function _defaultDraft(entity){
  var draft = {};
  ENTITY_CONFIG[entity].fields.forEach(function(field){ draft[field.key] = ''; });
  if(entity === 'customers') draft.status = 'active';
  if(entity === 'suppliers') draft.status = 'approved';
  if(entity === 'parts') draft.status = 'active';
  if(entity === 'parts') {
    draft.traceability_level = 'lot';
    draft.material_trace_required = 'yes';
  }
  if(entity === 'revisions') draft.status = 'released';
  if(entity === 'nc_program_releases') draft.status = 'draft';
  if(entity === 'capas') draft.status = 'open';
  if(entity === 'work_centers') draft.status = 'active';
  if(entity === 'machines') {
    draft.status = 'active';
    draft.telemetry_mode = 'machine';
    draft.connector_type = 'mtconnect';
    draft.heartbeat_sla_seconds = '120';
    draft.connector_required_for_release = 'yes';
    draft.manual_bridge_allowed = 'no';
  }
  if(entity === 'operators') {
    draft.status = 'active';
    draft.qualification_status = 'active';
  }
  if(entity === 'tooling_assets') { draft.status = 'active'; draft.warning_pct = '80'; draft.critical_pct = '95'; }
  if(entity === 'downtime_reason_codes') { draft.status = 'active'; draft.default_severity = 'major'; draft.planned_flag = 'no'; draft.escalation_sla_minutes = '30'; }
  if(entity === 'downtime_resolution_codes') draft.status = 'active';
  if(ENTITY_DEFAULTS[entity]){
    Object.keys(ENTITY_DEFAULTS[entity]).forEach(function(key){ draft[key] = ENTITY_DEFAULTS[entity][key]; });
  }
  return draft;
}

function _removeModal(){ var existing = document.getElementById('mdc-overlay'); if(existing) existing.remove(); }

function _renderModal(){
  _removeModal();
  var overlay = document.createElement('div');
  overlay.className = 'mdc-overlay';
  overlay.id = 'mdc-overlay';
  overlay.innerHTML = '' +
    '<div class="mdc-shell">' +
      '<div class="mdc-header">' +
        '<div><div class="mdc-title">' + _escHtml(_t('Quản lý dữ liệu nền', 'Master Data Control')) + '</div><div class="mdc-subtitle">' + _escHtml(_t('Quản trị dữ liệu dùng chung cho biểu mẫu, đơn hàng và tra cứu runtime.', 'Governed shared data for forms, orders, and runtime lookups.')) + '</div></div>' +
        '<button type="button" class="mdc-close" id="mdc-close">×</button>' +
      '</div>' +
      '<div class="mdc-body">' +
        '<aside class="mdc-rail" id="mdc-rail"></aside>' +
        '<section class="mdc-list"><div class="mdc-toolbar"><input type="search" class="mdc-search" id="mdc-search" placeholder="' + _escHtml(_t('Tìm kiếm dữ liệu nền...', 'Search master data...')) + '"><button type="button" class="mdc-btn mdc-btn-primary" id="mdc-create">' + _escHtml(_t('Tạo mới', 'Create')) + '</button></div><div id="mdc-grid"></div></section>' +
        '<section class="mdc-editor" id="mdc-editor"></section>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  document.getElementById('mdc-close').onclick = _removeModal;
  overlay.addEventListener('click', function(e){ if(e.target === overlay) _removeModal(); });
  document.getElementById('mdc-search').addEventListener('input', function(e){ _mdState.search = _normalizeText(e.target.value); _renderList(); });
  overlay.addEventListener('input', function(e){
    if(e.target && e.target.id === 'mdc-entity-search'){
      _mdState.entitySearch = _normalizeText(e.target.value);
      _renderRail();
    }
  });
  document.getElementById('mdc-create').addEventListener('click', function(){ _mdState.selectedId = ''; _mdState.draft = _defaultDraft(_mdState.entity); _renderList(); _renderEditor(); });
  _renderRail();
  _renderList();
  _renderEditor();
}

function _renderRail(){
  var rail = document.getElementById('mdc-rail');
  if(!rail) return;
  var html = '<div class="mdc-rail-title">' + _escHtml(_t('Thực thể dữ liệu', 'Data entities')) + '</div>' +
    '<input type="search" class="mdc-entity-search" id="mdc-entity-search" placeholder="' + _escHtml(_t('Tìm loại dữ liệu nền...', 'Search entity types...')) + '" value="' + _escHtml(_mdState.entitySearch || '') + '">';
  Object.keys(ENTITY_CONFIG).forEach(function(entity){
    var cfg = ENTITY_CONFIG[entity];
    var hay = _normalizeText([cfg.labelEn || '', cfg.labelVi || '', entity].join(' '));
    if(_mdState.entitySearch && hay.indexOf(_mdState.entitySearch) < 0) return;
    var active = entity === _mdState.entity ? ' active' : '';
    html += '<button type="button" class="mdc-entity-btn' + active + '" data-entity="' + entity + '">' +
      '<span class="mdc-entity-name">' + _escHtml(cfg.labelEn || cfg.labelVi || entity) + '</span>' +
      '<span class="mdc-entity-meta">' + _escHtml(cfg.labelVi || '') + ' · ' + _escHtml(String(_getEntityRows(entity).length)) + ' ' + _escHtml(_t('bản ghi', 'records')) + '</span>' +
    '</button>';
  });
  rail.innerHTML = html;
  Array.prototype.forEach.call(rail.querySelectorAll('[data-entity]'), function(btn){
    btn.addEventListener('click', function(){
      _mdState.entity = btn.getAttribute('data-entity') || 'customers';
      _mdState.search = '';
      _mdState.selectedId = '';
      _mdState.draft = _defaultDraft(_mdState.entity);
      var search = document.getElementById('mdc-search'); if(search) search.value = '';
      _renderRail(); _renderList(); _renderEditor();
    });
  });
}

function _renderList(){
  var host = document.getElementById('mdc-grid');
  if(!host) return;
  var cfg = ENTITY_CONFIG[_mdState.entity];
  var rows = _getEntityRows(_mdState.entity).filter(function(item){ return _matchesSearch(item, _mdState.search); });
  if(!rows.length){
    host.innerHTML = '<div class="mdc-grid"><div class="mdc-empty">' + _escHtml(cfg.emptyVi) + '</div></div>';
    return;
  }
  var html = '<div class="mdc-grid"><div class="mdc-grid-head">';
  cfg.listColumns.forEach(function(col){ html += '<div>' + _escHtml(col.label) + '</div>'; });
  html += '</div>';
  rows.forEach(function(row){
    var id = String(row[cfg.key] || '');
    var active = id === _mdState.selectedId ? ' active' : '';
    html += '<div class="mdc-grid-row' + active + '" data-id="' + _escHtml(id) + '">';
    cfg.listColumns.forEach(function(col){ html += '<div>' + _escHtml(row[col.key] || '—') + '</div>'; });
    html += '</div>';
  });
  html += '</div>';
  host.innerHTML = html;
  Array.prototype.forEach.call(host.querySelectorAll('.mdc-grid-row'), function(rowEl){
    rowEl.addEventListener('click', function(){
      var id = rowEl.getAttribute('data-id') || '';
      _mdState.selectedId = id;
      _mdState.draft = _clone(_getEntityRows(_mdState.entity).find(function(row){ return String(row[cfg.key] || '') === id; }) || _defaultDraft(_mdState.entity));
      _renderList();
      _renderEditor();
    });
  });
}

function _renderField(field, value){
  if(field.type === 'select'){
    var options = _fieldOptions(field, value);
    var selectHtml = '<select class="mdc-select" name="' + field.key + '"' + (field.required ? ' required' : '') + '><option value="">' + _escHtml(_t('Chọn', 'Select')) + '</option>';
    options.forEach(function(opt){
      var selected = String(value || '') === String(opt.value) ? ' selected' : '';
      selectHtml += '<option value="' + _escHtml(opt.value) + '"' + selected + '>' + _escHtml(_t(opt.label, opt.labelEn || opt.label)) + '</option>';
    });
    return selectHtml + '</select>';
  }
  if(field.type === 'lookup'){
    var options = _lookupOptions(field.entity || 'customers');
    var html = '<select class="mdc-select" name="' + field.key + '"' + (field.required ? ' required' : '') + '><option value="">' + _escHtml(_t('Chọn', 'Select')) + '</option>';
    options.forEach(function(opt){
      var selected = String(value || '') === String(opt.value) ? ' selected' : '';
      html += '<option value="' + _escHtml(opt.value) + '"' + selected + '>' + _escHtml(opt.label) + '</option>';
    });
    return html + '</select>';
  }
  if(field.type === 'textarea') return '<textarea class="mdc-textarea" name="' + field.key + '"' + (field.required ? ' required' : '') + '>' + _escHtml(value || '') + '</textarea>';
  return '<input class="mdc-input" type="' + _escHtml(field.type || 'text') + '" name="' + field.key + '" value="' + _escHtml(value || '') + '"' + (field.required ? ' required' : '') + '>';
}

function _renderEditor(){
  var editor = document.getElementById('mdc-editor');
  if(!editor) return;
  var cfg = ENTITY_CONFIG[_mdState.entity];
  var draft = _mdState.draft || _defaultDraft(_mdState.entity);
  _mdState.draft = draft;
  var isUpdate = !!_mdState.selectedId;
  var html = '' +
    '<div class="mdc-editor-head">' +
      '<div class="mdc-editor-title">' + _escHtml(_t(isUpdate ? 'Cập nhật bản ghi' : 'Tạo bản ghi mới', isUpdate ? 'Update record' : 'Create record')) + '</div>' +
      '<div class="mdc-editor-sub">' + _escHtml(_t(isUpdate ? 'Chỉnh sửa dữ liệu nền có kiểm soát trước khi dùng trong biểu mẫu hoặc đơn hàng.' : 'Thiết lập dữ liệu nền để lookup, tự điền và liên kết runtime hoạt động chính xác.', isUpdate ? 'Edit governed master data before it is used in forms or orders.' : 'Create source data for lookups, autofill, and runtime linking.')) + '</div>' +
    '</div>' +
    '<div class="mdc-editor-body"><form id="mdc-form">';
  cfg.fields.forEach(function(field){
    html += '<div class="mdc-field"><label class="mdc-label">' + _escHtml(field.label) + (field.required ? ' *' : '') + '</label>' + _renderField(field, draft[field.key] || '');
    if(field.helper) html += '<span class="mdc-helper">' + _escHtml(field.helper) + '</span>';
    html += '</div>';
  });
  html += '<div class="mdc-footer"><button type="button" class="mdc-btn mdc-btn-ghost" id="mdc-reset">' + _escHtml(_t('Đặt lại', 'Reset')) + '</button><button type="submit" class="mdc-btn mdc-btn-primary">' + _escHtml(_t('Lưu dữ liệu', 'Save data')) + '</button></div></form></div>';
  editor.innerHTML = html;

  var form = document.getElementById('mdc-form');
  var reset = document.getElementById('mdc-reset');
  if(reset) reset.onclick = function(){
    _mdState.draft = _mdState.selectedId ? _clone(_getEntityRows(_mdState.entity).find(function(row){ return String(row[cfg.key] || '') === _mdState.selectedId; }) || _defaultDraft(_mdState.entity)) : _defaultDraft(_mdState.entity);
    _renderEditor();
  };
  if(form) form.onsubmit = function(e){
    e.preventDefault();
    var payload = {};
    var invalidEl = null;
    cfg.fields.forEach(function(field){
      var el = form.querySelector('[name="' + field.key + '"]');
      var value = el ? String(el.value || '').trim() : '';
      payload[field.key] = value;
      if(field.required && !value && !invalidEl) invalidEl = el;
    });
    if(invalidEl){ invalidEl.focus(); _toast(_t('Vui lòng điền đủ các trường bắt buộc.', 'Please complete the required fields.'), 'warn'); return; }
    _api('master_data_upsert', { entity:_mdState.entity, item:payload }, 'POST').then(function(res){
      if(!res || !res.ok){ _toast(_t('Không thể lưu dữ liệu nền.', 'Could not save master data.'), 'error'); return; }
      return window._mdEnsureSnapshot(true).then(function(snapshot){
        var key = cfg.key;
        _mdState.selectedId = String((res.item || payload)[key] || payload[key] || '');
        _mdState.draft = _clone(res.pending ? payload : (res.item || payload));
        _renderRail(); _renderList(); _renderEditor();
        window.dispatchEvent(new CustomEvent('master-data:updated', { detail:{ snapshot:snapshot, entity:_mdState.entity, item:res.item || payload } }));
        _toast(res.message || _t('Đã lưu dữ liệu nền.', 'Master data saved.'), res.pending ? 'warn' : 'success');
      });
    }).catch(function(){ _toast(_t('Lỗi mạng khi lưu dữ liệu nền.', 'Network error while saving master data.'), 'error'); });
  };
}

window._mdEnsureSnapshot = function(force){
  if(!force && _mdCache) return Promise.resolve(_mdCache);
  if(!force && _mdPromise) return _mdPromise;
  _mdPromise = _api('master_data_snapshot', {}, 'GET').then(function(res){
    _mdCache = (res && res.ok && res.data) ? res.data : Object.keys(ENTITY_CONFIG).reduce(function(out, key){ out[key] = []; return out; }, {});
    return _mdCache;
  }).finally(function(){ _mdPromise = null; });
  return _mdPromise;
};

window._mdGetSnapshot = function(){ return _mdCache ? _clone(_mdCache) : null; };
window._mdLookupOptions = function(entity){ return _lookupOptions(entity); };
window._mdOpenControl = function(entity){
  _injectStyles();
  if(entity && ENTITY_CONFIG[entity]) _mdState.entity = entity;
  return window._mdEnsureSnapshot(false).then(function(){
    _mdState.selectedId = '';
    _mdState.search = '';
    _mdState.draft = _defaultDraft(_mdState.entity);
    _renderModal();
  });
};

})();
