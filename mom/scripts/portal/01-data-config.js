// ═══════════════════════════════════════════════════
// DATABASE
// ═══════════════════════════════════════════════════

// Editor engine feature flags (legacy by default).
window.qmsEditorConfig = Object.assign({
  engine:'legacy',       // 'legacy' | 'tiptap'
  tiptapPilot:false
}, window.qmsEditorConfig||{});

let USERS = []; // Server-side auth SSOT. Admin screens must not inject local demo users.
window.USERS = USERS;

// Load server-side users list for Admin screens (read-only, authoritative)
async function loadUsersFromServerIfAdmin(){
  try{
    if(!currentUser) return;
    const role = (currentUser.role||'');
    const isAdm = !!(ROLES[role] && ROLES[role].admin);
    // Also allow roles explicitly granted the users admin tab via module access config
    const hasTabAccess = typeof canUserAccessAdminTab === 'function' && canUserAccessAdminTab('users');
    if(!isAdm && !hasTabAccess) return;

    const res = await apiCall('admin_users_list', null, 'GET');
    if(res && res.ok && Array.isArray(res.users)){
      // Normalize for UI expectations
      // V10 Role migration map: old role keys → new JD-based keys
      const _ROLE_MIGRATE = {
        general_director:'ceo',deputy_director:'production_director',
        prod_manager:'cnc_workshop_manager',prod_supervisor:'shift_leader',
        cnc_setup:'setup_technician',cnc_programmer:'cam_nc_programmer',
        qms_supervisor:'qms_engineer',doc_controller:'qms_engineer',
        purchasing_officer:'buyer',procurement_manager:'supply_chain_manager',
        sales_officer:'estimator',planning_officer:'production_planner',
        hse_officer:'ehs_specialist',maintenance_tech:'maintenance_technician',
        finance_officer:'gl_payroll_accountant',
        warehouse_staff:'warehouse_clerk',warehouse_lead:'supply_chain_manager',
        deburr_tech:'deburr_technician',tooling_tech:'tool_storekeeper',
        clean_tech:'cleaning_packaging_technician',
        production_engineer:'process_engineer',dfm_engineer:'process_engineer',
        metrology_specialist:'qc_inspector',
        receiving_clerk:'warehouse_clerk',storekeeper:'warehouse_clerk',
        shipping_packing:'logistics_coordinator',trainee:'cnc_operator'
      };
      USERS = res.users.map(u=>({
        // Prefer the system identity key over UI-local numeric ids.
        id: String(u.employee_id || u.id || u.username || ''),
        employee_id: String(u.employee_id || ''),
        name: u.name || u.username || '',
        username: u.username || '',
        role: _ROLE_MIGRATE[u.role] || u.role || 'cnc_operator',
        dept: (u.dept==='BOD'?'EXE':(u.dept==='WH'?'WHS':(u.dept||''))),
        title: (u.title||''),
        jd_code: String(u.jd_code || ''),
        jd_title: String(u.jd_title || ''),
        role_source: (u.role_source && typeof u.role_source === 'object') ? u.role_source : {},
        hcm_org_unit_id: String(u.hcm_org_unit_id || ''),
        hcm_position_id: String(u.hcm_position_id || ''),
        cccd: (u.cccd || ''),
        phone: (u.phone || ''),
        personal_email: (u.personal_email || ''),
        org_company_code: String(u.org_company_code || ''),
        org_legal_entity_code: String(u.org_legal_entity_code || ''),
        org_plant_id: String(u.org_plant_id || ''),
        org_site_id: String(u.org_site_id || ''),
        avatar: u.avatar || u.avatar_icon || '👤',
        avatar_icon: u.avatar_icon || u.avatar || '👤',
        avatar_image: u.avatar_image || '',
        avatar_url: u.avatar_url || '',
        active: (u.active !== false),
        // Flatten nested mfa.enabled into the flat boolean used by FE table/modal.
        mfa_enabled: !!(u.mfa && u.mfa.enabled),
        // Keep pin empty: passwords are server-side only
        pin: ''
      }));
      window.USERS = USERS;
      try { window.dispatchEvent(new CustomEvent('admin:users:updated', { detail:{ users:USERS } })); } catch(_){}
      if(typeof syncUsersWithAuthoritativeOrg === 'function') syncUsersWithAuthoritativeOrg();
      if(currentPage==='admin'){ renderAdmin(); }
    }
  }catch(e){
    // silent: admin listing is best-effort
  }
}

window.loadSharedAdminUsers = async function(force){
  if(!force && Array.isArray(window.USERS) && window.USERS.length) return window.USERS;
  await loadUsersFromServerIfAdmin();
  return Array.isArray(window.USERS) ? window.USERS : [];
};




const ROLES = {
  // ═══ EXECUTIVE (EXE) ═══
  ceo:                          {level:0,approve:true,admin:true,canEditDocs:true,canCreateDocs:true,canViewActivity:true,canExportUsers:true,label:"Giám Đốc Điều Hành (CEO)",labelEn:"Chief Executive Officer (CEO)",color:"var(--purple-light,#7c3aed)",icon:"👔",dept:"EXE"},
  production_director:          {level:1,approve:true,admin:false,canEditDocs:true,canCreateDocs:true,canViewActivity:true,canExportUsers:false,label:"Giám Đốc Sản Xuất",labelEn:"Production Director",color:"var(--purple-light,#6d28d9)",icon:"🎖️",dept:"EXE"},
  // ═══ PRODUCTION (PRO) ═══
  cnc_workshop_manager:         {level:2,approve:false,admin:false,canEditDocs:true,canCreateDocs:false,canViewActivity:false,canExportUsers:false,label:"Quản Đốc Xưởng CNC",labelEn:"CNC Workshop Manager",color:"var(--green-dark,#059669)",icon:"🏭",dept:"PRO"},
  shift_leader:                 {level:3,approve:false,admin:false,canEditDocs:false,canViewActivity:false,canExportUsers:false,label:"Trưởng Ca",labelEn:"Shift Leader",color:"var(--green-dark,#16a34a)",icon:"📋",dept:"PRO"},
  setup_technician:             {level:4,approve:false,admin:false,canEditDocs:false,canViewActivity:false,canExportUsers:false,label:"Kỹ Thuật Viên Setup",labelEn:"Setup Technician",color:"var(--green-light,#22c55e)",icon:"🛠️",dept:"PRO"},
  cnc_operator:                 {level:4,approve:false,admin:false,canEditDocs:false,canViewActivity:false,canExportUsers:false,label:"Thợ Vận Hành CNC",labelEn:"CNC Operator",color:"#4ade80",icon:"🔩",dept:"PRO"},
  deburr_team_lead:             {level:3,approve:false,admin:false,canEditDocs:false,canViewActivity:false,canExportUsers:false,label:"Trưởng Nhóm Deburr",labelEn:"Deburr Team Lead",color:"var(--green-light,#10b981)",icon:"🧽",dept:"PRO"},
  deburr_technician:            {level:4,approve:false,admin:false,canEditDocs:false,canViewActivity:false,canExportUsers:false,label:"Kỹ Thuật Viên Deburr",labelEn:"Deburr Technician",color:"#34d399",icon:"🧹",dept:"PRO"},
  production_planner:           {level:3,approve:false,admin:false,canEditDocs:false,canViewActivity:false,canExportUsers:false,label:"Nhân Viên Kế Hoạch SX",labelEn:"Production Planner",color:"#14b8a6",icon:"📅",dept:"PRO"},
  cleaning_packaging_supervisor:{level:3,approve:false,admin:false,canEditDocs:false,canViewActivity:false,canExportUsers:false,label:"Giám Sát Vệ Sinh & Đóng Gói",labelEn:"Cleaning & Packaging Supervisor",color:"#0d9488",icon:"🧼",dept:"PRO"},
  cleaning_packaging_technician:{level:4,approve:false,admin:false,canEditDocs:false,canViewActivity:false,canExportUsers:false,label:"Kỹ Thuật Viên Vệ Sinh & Đóng Gói",labelEn:"Cleaning Packaging Technician",color:"#2dd4bf",icon:"✨",dept:"PRO"},
  maintenance_technician:       {level:4,approve:false,admin:false,canEditDocs:false,canViewActivity:false,canExportUsers:false,label:"Kỹ Thuật Viên Bảo Trì",labelEn:"Maintenance Technician",color:"#71717a",icon:"🔧",dept:"PRO"},
  // ═══ ENGINEERING (ENG) ═══
  engineering_lead:             {level:2,approve:false,admin:false,canEditDocs:true,canCreateDocs:false,canViewActivity:false,canExportUsers:false,label:"Trưởng Phòng Kỹ Thuật",labelEn:"Engineering Lead / Manager",color:"#0369a1",icon:"⚙️",dept:"ENG"},
  process_engineer:             {level:3,approve:false,admin:false,canEditDocs:true,canViewActivity:false,canExportUsers:false,label:"Kỹ Sư Quy Trình",labelEn:"Process Engineer",color:"#0284c7",icon:"🧠",dept:"ENG"},
  cam_nc_programmer:            {level:3,approve:false,admin:false,canEditDocs:true,canViewActivity:false,canExportUsers:false,label:"Lập Trình CAM/NC",labelEn:"CAM/NC Programmer",color:"var(--cyan-light,#0891b2)",icon:"💻",dept:"ENG"},
  // ═══ QUALITY (QA) ═══
  qa_manager:                   {level:1,approve:true,admin:true,canEditDocs:true,canCreateDocs:true,canViewActivity:true,canExportUsers:true,label:"Trưởng Phòng Chất Lượng",labelEn:"QA Manager",color:"var(--red-light,#dc2626)",icon:"🛡️",dept:"QA"},
  quality_engineer:             {level:3,approve:false,admin:false,canEditDocs:true,canViewActivity:false,canExportUsers:false,label:"Kỹ Sư Chất Lượng",labelEn:"Quality Engineer",color:"#e11d48",icon:"🔬",dept:"QA"},
  qc_inspector:                 {level:3,approve:false,admin:false,canEditDocs:false,canViewActivity:false,canExportUsers:false,label:"QC / Lập Trình CMM",labelEn:"QC Inspector / CMM Programmer-Operator",color:"#f43f5e",icon:"🔍",dept:"QA"},
  qms_engineer:                 {level:2,approve:false,admin:false,canEditDocs:true,canCreateDocs:true,canViewActivity:true,canExportUsers:false,label:"Kỹ Sư QMS / Document Controller",labelEn:"QMS Engineer",color:"#be123c",icon:"📋",dept:"QA"},
  internal_auditor:             {level:2,approve:false,admin:false,canEditDocs:false,canViewActivity:true,canExportUsers:false,label:"Chuyên Viên Đánh Giá Nội Bộ",labelEn:"Internal Auditor (Outsource)",color:"#9f1239",icon:"📊",dept:"QA"},
  // ═══ SUPPLY CHAIN (SCM) ═══
  supply_chain_manager:         {level:2,approve:false,admin:false,canEditDocs:true,canViewActivity:false,canExportUsers:false,label:"Trưởng Phòng Cung Ứng",labelEn:"Supply Chain Manager",color:"#84cc16",icon:"🛒",dept:"SCM"},
  buyer:                        {level:3,approve:false,admin:false,canEditDocs:false,canViewActivity:false,canExportUsers:false,label:"Nhân Viên Mua Hàng",labelEn:"Buyer / Purchasing",color:"#a3e635",icon:"🛍️",dept:"SCM"},
  warehouse_clerk:              {level:4,approve:false,admin:false,canEditDocs:false,canViewActivity:false,canExportUsers:false,label:"Nhân Viên Kho",labelEn:"Warehouse Clerk",color:"#65a30d",icon:"📦",dept:"SCM"},
  tool_storekeeper:             {level:4,approve:false,admin:false,canEditDocs:false,canViewActivity:false,canExportUsers:false,label:"Thủ Kho Dụng Cụ",labelEn:"Tool Crib / Tool Storekeeper",color:"#4d7c0f",icon:"🧰",dept:"SCM"},
  logistics_coordinator:        {level:3,approve:false,admin:false,canEditDocs:false,canViewActivity:false,canExportUsers:false,label:"Điều Phối Giao Nhận",labelEn:"Logistics & Shipping Coordinator",color:"var(--green-dark,#16a34a)",icon:"🚚",dept:"SCM"},
  // ═══ SALES (SAL) ═══
  estimator:                    {level:3,approve:false,admin:false,canEditDocs:false,canViewActivity:false,canExportUsers:false,label:"Nhân Viên Báo Giá",labelEn:"Estimator",color:"var(--amber-light,#f59e0b)",icon:"📊",dept:"SAL"},
  customer_service:             {level:3,approve:false,admin:false,canEditDocs:false,canViewActivity:false,canExportUsers:false,label:"Dịch Vụ Khách Hàng",labelEn:"Customer Service",color:"#fbbf24",icon:"🤝",dept:"SAL"},
  // ═══ FINANCE (FIN) ═══
  finance_manager:              {level:2,approve:false,admin:false,canEditDocs:true,canViewActivity:false,canExportUsers:false,label:"Trưởng Phòng Tài Chính",labelEn:"Finance Manager",color:"#a21caf",icon:"🏦",dept:"FIN"},
  gl_payroll_accountant:        {level:3,approve:false,admin:false,canEditDocs:false,canViewActivity:false,canExportUsers:false,label:"Kế Toán Tổng Hợp & Lương",labelEn:"General Ledger & Payroll Accountant",color:"#c026d3",icon:"💰",dept:"FIN"},
  ap_ar_accountant:             {level:3,approve:false,admin:false,canEditDocs:false,canViewActivity:false,canExportUsers:false,label:"Kế Toán Công Nợ",labelEn:"AP/AR & Payments Accountant",color:"#d946ef",icon:"💳",dept:"FIN"},
  // ═══ HR ═══
  hr_manager:                   {level:2,approve:false,admin:false,canEditDocs:true,canViewActivity:false,canExportUsers:false,label:"Trưởng Phòng Nhân Sự",labelEn:"HR Manager",color:"var(--purple-light,#8b5cf6)",icon:"👥",dept:"HR"},
  // ═══ EHS ═══
  ehs_specialist:               {level:3,approve:false,admin:false,canEditDocs:false,canViewActivity:false,canExportUsers:false,label:"Chuyên Viên An Toàn - Môi Trường",labelEn:"EHS Specialist",color:"#ea580c",icon:"🦺",dept:"EHS"},
  // ═══ IT ═══
  it_admin:                     {level:2,approve:false,admin:true,canEditDocs:true,canCreateDocs:true,canViewActivity:true,canExportUsers:true,label:"Quản Trị Hệ Thống IT",labelEn:"IT Admin",color:"var(--purple-light,#6366f1)",icon:"🖥️",dept:"IT"},
  epicor_admin:                 {level:3,approve:false,admin:false,canEditDocs:true,canViewActivity:false,canExportUsers:false,label:"Quản Trị Epicor ERP",labelEn:"Epicor System Administrator",color:"var(--purple-light,#4f46e5)",icon:"⚡",dept:"IT"}
};

// ═══════════════════════════════════════════════════
// HmRegistry Integration — Centralized Data Layer
// Khi HmRegistry sẵn sàng, trigger init để eager load status-options.
// HmRegistry.badge(setKey, value) thay thế mọi statusBadge() cục bộ.
// ═══════════════════════════════════════════════════
if(window.HmRegistry && typeof HmRegistry.init === 'function'){
  HmRegistry.init();
}

/**
 * Global statusBadge helper — delegates to HmRegistry if available.
 * Tất cả module nên gọi hàm này thay vì tự hardcode switch/case colors.
 * @param {string} setKey - e.g. 'so_status', 'ncr_status', 'doc_status'
 * @param {string} value  - e.g. 'draft', 'approved', 'closed'
 * @returns {string} HTML badge span
 */
function hmBadge(setKey, value){
  if(window.HmRegistry) return HmRegistry.badge(setKey, value);
  // Fallback nếu HmRegistry chưa load
  var color = 'var(--gray-500,#6b7280)';
  var label = value || '';
  return '<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;color:var(--text-inverse,#fff);background:' + color + '">' + label + '</span>';
}

// ═══════════════════════════════════════════════════
// DEPARTMENTS & TITLES (Admin-managed)
// ═══════════════════════════════════════════════════
const DEFAULT_DEPARTMENTS = [
  {code:'EXE',label:'Ban Giám Đốc',labelEn:'Executive',color:'var(--purple-light,#7c3aed)'},
  {code:'PRO',label:'Phòng Sản Xuất',labelEn:'Production',color:'var(--green-dark,#059669)'},
  {code:'ENG',label:'Phòng Kỹ Thuật',labelEn:'Engineering',color:'var(--cyan,#0369a1)'},
  {code:'QA',label:'Phòng Chất Lượng',labelEn:'Quality',color:'var(--red-light,#dc2626)'},
  {code:'SCM',label:'Phòng Cung Ứng',labelEn:'Supply Chain',color:'var(--green,#84cc16)'},
  {code:'SAL',label:'Phòng Kinh Doanh',labelEn:'Sales',color:'var(--amber-light,#f59e0b)'},
  {code:'FIN',label:'Phòng Tài Chính',labelEn:'Finance',color:'var(--purple,#a21caf)'},
  {code:'HR',label:'Phòng Nhân Sự',labelEn:'Human Resources',color:'var(--purple-light,#8b5cf6)'},
  {code:'EHS',label:'Phòng An Toàn',labelEn:'EHS',color:'var(--green-dark,#16a34a)'},
  {code:'IT',label:'Phòng CNTT',labelEn:'IT',color:'var(--text-primary,#0f172a)'},
  {code:'GEN',label:'Khác',labelEn:'General',color:'var(--text-secondary,#94a3b8)'}
];
const DEFAULT_DEPT_TITLES = {
  EXE:[
    'Chief Executive Officer (CEO)',
    'Production Director'
  ],
  PRO:[
    'CNC Workshop Manager',
    'Shift Leader',
    'Setup Technician',
    'CNC Operator',
    'Deburr Team Lead',
    'Deburr Technician',
    'Production Planner',
    'Cleaning & Packaging Supervisor',
    'Cleaning Packaging Technician',
    'Maintenance Technician'
  ],
  ENG:[
    'Engineering Lead / Manager',
    'Process Engineer',
    'CAM/NC Programmer'
  ],
  QA:[
    'QA Manager',
    'Quality Engineer',
    'QC Inspector / CMM Programmer-Operator',
    'QMS Engineer',
    'Internal Auditor (Outsource)'
  ],
  SCM:[
    'Supply Chain Manager',
    'Buyer / Purchasing',
    'Warehouse Clerk',
    'Tool Crib / Tool Storekeeper',
    'Logistics & Shipping Coordinator'
  ],
  SAL:[
    'Estimator',
    'Customer Service'
  ],
  FIN:[
    'Finance Manager',
    'General Ledger & Payroll Accountant',
    'AP/AR & Payments Accountant'
  ],
  HR:[
    'HR Manager'
  ],
  EHS:[
    'EHS Specialist'
  ],
  IT:[
    'IT Admin',
    'Epicor System Administrator'
  ],
  GEN:[
    'Trainee / Intern'
  ]
};
const DEFAULT_TITLES = [...new Set(Object.values(DEFAULT_DEPT_TITLES).flat())];
let DEPARTMENTS = JSON.parse(JSON.stringify(DEFAULT_DEPARTMENTS));
let DEPT_TITLES = JSON.parse(JSON.stringify(DEFAULT_DEPT_TITLES));
let TITLES = [...DEFAULT_TITLES];

// V9 migration: clear stale session cache BEFORE loading
(function(){
  const QMS_VER = 'v10.4';
  try {
    if(sessionStorage.getItem('hesem_qms_version') !== QMS_VER){
      sessionStorage.removeItem('hesem_departments');
      sessionStorage.removeItem('hesem_dept_titles');
      sessionStorage.removeItem('hesem_titles');
      sessionStorage.removeItem('hesem_users_db');
      sessionStorage.removeItem('hesem_activity_log');
      sessionStorage.removeItem('hesem_perm_overrides');
      sessionStorage.removeItem('hesem_role_docs');
      sessionStorage.setItem('hesem_qms_version', QMS_VER);
      console.log('[QMS] v10.3 migration: cleared stale governance cache');
    }
  } catch(e){}
})();

// Load customizations (session-scoped)
try{
  const sd=sessionStorage.getItem('hesem_departments');
  if(sd){const p=JSON.parse(sd);if(Array.isArray(p)&&p.length)DEPARTMENTS=p;}
  // Migrate legacy dept codes to V9
  DEPARTMENTS=DEPARTMENTS.map(d=>{
    if(!d||!d.code)return d;
    const c=d.code;
    if(c==='BOD') return Object.assign({},d,{code:'EXE',label:d.label||'Ban Giám Đốc',labelEn:d.labelEn||'Executive'});
    if(c==='WH'||c==='WHS') return Object.assign({},d,{code:'SCM',label:'Phòng Cung Ứng',labelEn:'Supply Chain'});
    if(c==='PUR') return Object.assign({},d,{code:'SCM',label:'Phòng Cung Ứng',labelEn:'Supply Chain'});
    if(c==='MNT'||c==='PLA') return null; // Merged into PRO/SCM
    if(c==='HSE') return Object.assign({},d,{code:'EHS',label:'Phòng An Toàn',labelEn:'EHS'});
    return d;
  }).filter(Boolean);
  // Deduplicate after migration
  const seenCodes=new Set();
  DEPARTMENTS=DEPARTMENTS.filter(d=>{if(seenCodes.has(d.code))return false;seenCodes.add(d.code);return true;});
}catch(e){}
try{
  const st=sessionStorage.getItem('hesem_dept_titles');
  if(st){
    const p=JSON.parse(st);
    if(p && typeof p==='object') DEPT_TITLES=p;
  }
}catch(e){}
// Legacy support: if hesem_titles exists and dept->title map not customized, allow restoring flat titles
try{
  const st=sessionStorage.getItem('hesem_titles');
  if(st){
    const p=JSON.parse(st);
    if(Array.isArray(p)&&p.length){
      // If admin previously used flat TITLES without dept mapping, keep them under GEN
      if(!sessionStorage.getItem('hesem_dept_titles')){
        DEPT_TITLES = Object.assign({}, DEFAULT_DEPT_TITLES, {GEN:[...new Set([...(DEFAULT_DEPT_TITLES.GEN||[]), ...p])]});
      }
    }
  }
}catch(e){}

function syncTitlesFromDept(){
  try{TITLES=[...new Set(Object.values(DEPT_TITLES).flat())];}catch(e){TITLES=[...DEFAULT_TITLES];}
}
syncTitlesFromDept();

function saveDepartments(){try{sessionStorage.setItem('hesem_departments',JSON.stringify(DEPARTMENTS));}catch(e){}}
function saveDeptTitles(){try{sessionStorage.setItem('hesem_dept_titles',JSON.stringify(DEPT_TITLES));}catch(e){}}
function saveTitles(){try{sessionStorage.setItem('hesem_titles',JSON.stringify(TITLES));}catch(e){}}
function titlesForDept(code){
  return (DEPT_TITLES && DEPT_TITLES[code]) ? DEPT_TITLES[code] : [];
}


// ═══════════════════════════════════════════════════
// ACTIVITY LOG (User Behavior Tracking)
// ═══════════════════════════════════════════════════
let ACTIVITY_LOG = [];
try{const sa=sessionStorage.getItem('hesem_activity_log');if(sa){const p=JSON.parse(sa);if(Array.isArray(p))ACTIVITY_LOG=p;}}catch(e){}
function saveActivityLog(){try{sessionStorage.setItem('hesem_activity_log',JSON.stringify(ACTIVITY_LOG.slice(-2000)));}catch(e){}}
let _trackSession = null;
let _trackPageStart = null;

// ═══ DATA COLLECTION SETTINGS ═══
let DATA_SETTINGS = {collect_gps:true,collect_ip:true,collect_device:true,collect_navigation:true,collect_connection:true,require_consent:true};
let DATA_SETTINGS_DRAFT = null; // null = no pending changes
async function loadDataSettings(){try{const r=await apiCall('get_data_settings',null,'GET');if(r&&r.ok&&r.settings)Object.assign(DATA_SETTINGS,r.settings);}catch(e){}}
async function saveDataSettings(s){try{const r=await apiCall('save_data_settings',s,'POST');if(r&&r.ok){Object.assign(DATA_SETTINGS,r.settings||s);return true;}else{console.error('saveDataSettings error:',r);return false;}}catch(e){console.error('saveDataSettings exception:',e);return false;}}
function toggleDataSetting(key,val){
  if(!DATA_SETTINGS_DRAFT) DATA_SETTINGS_DRAFT = Object.assign({},DATA_SETTINGS);
  DATA_SETTINGS_DRAFT[key]=val;
  // Update toggle visually without re-rendering entire tab
  const panel = document.getElementById('ds-panel');
  if(panel){
    const bar = document.getElementById('ds-action-bar');
    if(bar) bar.style.display='flex';
    // Update the toggle knob positions
    panel.querySelectorAll('[data-ds-key]').forEach(el=>{
      const k=el.dataset.dsKey;
      const on=DATA_SETTINGS_DRAFT[k];
      const track=el.querySelector('.ds-track');
      const knob=el.querySelector('.ds-knob');
      if(track) track.style.background=on?'var(--green-light,#10b981)':'var(--border,#d1d5db)';
      if(knob) knob.style.left=on?'22px':'3px';
      const cb=el.querySelector('input[type=checkbox]');
      if(cb) cb.checked=on;
    });
  }
}
async function saveDataSettingsDraft(){
  if(!DATA_SETTINGS_DRAFT) return;
  const draft = Object.assign({}, DATA_SETTINGS_DRAFT);
  const ok=await saveDataSettings(draft);
  if(ok){
    Object.assign(DATA_SETTINGS,draft);
    DATA_SETTINGS_DRAFT=null;
    showToast(lang==='en'?'✅ Settings saved':'✅ Đã lưu cài đặt');
    if(typeof loadAuthoritativeAuditTrail === 'function'){
      try{
        await loadAuthoritativeAuditTrail({force:true});
      }catch(e){}
    }
  } else {
    showToast(lang==='en'?'⚠ Save failed':'⚠ Lưu thất bại','error');
  }
  if(typeof renderAdmin === 'function' && currentPage === 'admin'){
    renderAdmin();
    return;
  }
  if(typeof renderAdminActivity === 'function'){
    renderAdminActivity();
  }
}
function cancelDataSettingsDraft(){
  DATA_SETTINGS_DRAFT=null;
  if(typeof renderAdmin === 'function' && currentPage === 'admin'){
    renderAdmin();
    return;
  }
  if(typeof renderAdminActivity === 'function'){
    renderAdminActivity();
  }
  // Re-open the panel
  setTimeout(()=>{const p=document.getElementById('ds-panel');if(p)p.style.display='';},50);
}

// canViewActivity helper: only roles with flag or general_director
function canViewActivityLog(){
  if(!currentUser) return false;
  const r = ROLES[currentUser.role];
  if(!r) return false;
  return r.canViewActivity === true;
}

function canExportUsersData(){
  if(!currentUser) return false;
  const r = ROLES[currentUser.role];
  if(!r) return false;
  return r.canExportUsers === true;
}

function requireGeolocation(){
  return new Promise((resolve)=>{
    if(!navigator.geolocation){
      resolve({ok:false, reason:'not_supported'});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ok:true, lat:pos.coords.latitude, lng:pos.coords.longitude, accuracy:pos.coords.accuracy}),
      err => resolve({ok:false, reason: err.code===1?'denied':err.code===2?'unavailable':'timeout'}),
      {enableHighAccuracy:true, timeout:15000, maximumAge:0}
    );
  });
}

function startActivityTracking(geoData){
  if(!currentUser) return;
  const connectionInfo = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
  _trackSession = {
    user: currentUser.username, name: currentUser.name,
    role: currentUser.role, dept: currentUser.dept||'',
    login_time: new Date().toISOString(), ip: '—',
    device: navigator.userAgent,
    device_short: (function(){
      const ua = navigator.userAgent;
      const m = ua.match(/(Chrome|Firefox|Safari|Edge|Opera|OPR|CriOS|FxiOS)[\/ ](\d+)/);
      const os = ua.match(/(Windows NT|Mac OS X|Linux|Android|iPhone OS)[\s/]*([\d._]*)/);
      return (m?m[1]+'/'+m[2]:'-')+' · '+(os?os[1].replace(' NT','').replace(' OS X','')+' '+os[2].replace(/_/g,'.'):'');
    })(),
    platform: navigator.platform || '—',
    screen: screen.width+'×'+screen.height+' @'+window.devicePixelRatio+'x',
    viewport: window.innerWidth+'×'+window.innerHeight,
    language: navigator.language || '—',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '—',
    online: navigator.onLine,
    connection_type: connectionInfo.effectiveType || '—',
    cookies_enabled: navigator.cookieEnabled,
    location: (DATA_SETTINGS.collect_gps && geoData && geoData.ok && geoData.lat) ? geoData.lat.toFixed(6)+','+geoData.lng.toFixed(6) : '—',
    location_accuracy: (DATA_SETTINGS.collect_gps && geoData && geoData.ok && geoData.accuracy) ? Math.round(geoData.accuracy)+'m' : '—',
    pages: []
  };
  // Get IP asynchronously
  fetch('https://api.ipify.org?format=json',{mode:'cors'}).then(r=>r.json()).then(d=>{
    if(_trackSession && d.ip) _trackSession.ip = d.ip;
    flushActivitySession();
  }).catch(()=>{});
  trackPageView('login','Đăng nhập hệ thống');
}

function trackPageView(pageId, pageTitle){
  if(!_trackSession || !DATA_SETTINGS.collect_navigation) return;
  const now = new Date().toISOString();
  // Close previous page with precise duration
  if(_trackPageStart && _trackSession.pages.length > 0){
    const last = _trackSession.pages[_trackSession.pages.length-1];
    last.duration_sec = Math.round((new Date(now) - new Date(last.entered_at))/1000);
    last.left_at = now;
  }
  _trackSession.pages.push({
    page_id: pageId,
    page_title: pageTitle || pageId,
    entered_at: now,
    left_at: null,
    duration_sec: 0
  });
  _trackPageStart = now;
  _trackSession.last_activity = now;
  _trackSession.total_pages = _trackSession.pages.length;
  flushActivitySession();
}

function flushActivitySession(){
  if(!_trackSession) return;
  const idx = ACTIVITY_LOG.findIndex(s => s.login_time === _trackSession.login_time && s.user === _trackSession.user);
  if(idx >= 0) ACTIVITY_LOG[idx] = JSON.parse(JSON.stringify(_trackSession));
  else ACTIVITY_LOG.push(JSON.parse(JSON.stringify(_trackSession)));
  saveActivityLog();
}

// ═══════════════════════════════════════════════════
// CONSENT DIALOG
// ═══════════════════════════════════════════════════
function showConsentDialog(){
  return new Promise((resolve)=>{
    const ov = document.createElement('div');
    ov.id = 'consent-overlay';
    ov.innerHTML = `
      <div class="consent-box">
        <div class="consent-header">
          <div class="c-icon">⚖️</div>
          <div>
            <h3>Điều khoản Sử dụng & Chính sách Bảo mật Thông tin</h3>
            <p>Terms of Use & Information Security Policy — HESEM Engineering</p>
          </div>
        </div>
        <div class="consent-body">
          <h4>ĐIỀU 1 — Phạm vi áp dụng</h4>
          <p style="font-size:12px;color:var(--text-2);line-height:1.7;margin-bottom:14px">
            Hệ thống Quản lý Chất lượng HESEM MOM ("Hệ thống") là tài sản trí tuệ thuộc sở hữu của Công ty Cổ phần HESEM Engineering ("Công ty"). Việc truy cập và sử dụng Hệ thống phải tuân thủ đầy đủ các điều khoản được quy định trong tài liệu này.
          </p>
          <h4>ĐIỀU 2 — Thu thập dữ liệu phiên làm việc</h4>
          <p style="font-size:12px;color:var(--text-2);line-height:1.7;margin-bottom:10px">
            Nhằm đảm bảo tính toàn vẹn, truy xuất nguồn gốc và tuân thủ các yêu cầu kiểm soát tài liệu theo ISO 9001:2026, Hệ thống sẽ tự động ghi nhận các thông tin sau trong suốt phiên làm việc:
          </p>
          <ul>
            <li><div class="li-icon">§1</div><div><b>Thời gian truy cập</b> — Ngày, giờ đăng nhập, thời lượng phiên làm việc và thời điểm kết thúc</div></li>
            <li><div class="li-icon">§2</div><div><b>Định danh kỹ thuật</b> — Địa chỉ IP, thông tin thiết bị, hệ điều hành, trình duyệt và độ phân giải màn hình</div></li>
            <li><div class="li-icon">§3</div><div><b>Vị trí truy cập</b> — Tọa độ địa lý tại thời điểm đăng nhập <em>(bắt buộc)</em></div></li>
            <li><div class="li-icon">§4</div><div><b>Lịch sử tương tác</b> — Danh sách các tài liệu/trang được truy cập, thời điểm bắt đầu xem, thời gian dừng tại mỗi trang và trình tự điều hướng</div></li>
            <li><div class="li-icon">§5</div><div><b>Thông tin kết nối</b> — Loại kết nối mạng, múi giờ, ngôn ngữ hệ thống</div></li>
          </ul>
          <h4 style="margin-top:14px">ĐIỀU 3 — Mục đích sử dụng dữ liệu</h4>
          <p style="font-size:12px;color:var(--text-2);line-height:1.7;margin-bottom:10px">
            Dữ liệu thu thập được sử dụng cho các mục đích hợp pháp sau đây:
            <b>(a)</b> Đảm bảo tuân thủ các yêu cầu kiểm soát tài liệu và truy xuất nguồn gốc theo ISO 9001:2026 và SEMI Standards;
            <b>(b)</b> Quản lý an ninh thông tin và bảo vệ tài sản trí tuệ của Công ty;
            <b>(c)</b> Kiểm toán nội bộ và đánh giá tuân thủ;
            <b>(d)</b> Phục vụ điều tra khi có dấu hiệu vi phạm quy chế bảo mật.
          </p>
          <div class="warn-note" style="background:var(--bg-surface-alt,#f0f7ff);border-color:var(--blue-light,#93c5fd);color:var(--brand,#1e40af)">
            📌 <b>ĐIỀU 4 — Quyền và nghĩa vụ:</b> Công ty bảo lưu toàn quyền sử dụng dữ liệu phiên làm việc đã thu thập theo quy định pháp luật hiện hành.
            Người dùng có nghĩa vụ cung cấp thông tin vị trí chính xác tại thời điểm truy cập. Việc cố tình che giấu, giả mạo thông tin truy cập có thể bị xử lý kỷ luật theo Nội quy Công ty.
            <br><br>
            <em style="font-size:11px;opacity:.8">By clicking "Accept & Continue", you acknowledge that you have read, understood, and agreed to the above terms. Refusal to accept will result in session termination.</em>
          </div>
        </div>
        <div class="consent-footer">
          <button class="btn-decline" id="consent-decline">✕ Từ chối & Đăng xuất</button>
          <button class="btn-accept" id="consent-accept">✓ Đồng ý & Tiếp tục</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    try{ if(typeof fixMojibakeDom==='function') fixMojibakeDom(ov); }catch(e){}
    document.getElementById('consent-accept').onclick = ()=>{ov.remove();resolve(true);};
    document.getElementById('consent-decline').onclick = ()=>{ov.remove();resolve(false);};
  });
}

// ═══════════════════════════════════════════════════
// DOCUMENT-LEVEL PERMISSIONS (role → [doc codes])
// ISO 9001:2026 / AS9100D / SEMI — Need-to-know principle
// "ALL" = full access. Wildcards: "SOP-1*" matches SOP-101, SOP-102, etc.
// ═══════════════════════════════════════════════════════════════════════
// Universal access base: policies, manual, training, org chart
const _UNI = [
  "POL-QMS*","QMS-MAN*","ANNEX-ORG*",
  "C0*","C1*","C*-L*",
  "TRAINING-MATRIX*","COMPETENCY*","ASSESSMENT*","SKILL*",
  "CERTIFICATE*","CERTIFICATION*","EVIDENCE*","QMS-OPS*",
  "ROLE*","TRAINEE*","TRAINER*",
  "OJT*","DRILL*","SYS-OPS*","TRN-OPS*","MRR*",
  "ANNEX-105*","ANNEX-106*","ANNEX-117*",
  "FRM-801*","FRM-802*","FRM-803*","FRM-804*","FRM-805*",
  "FRM-806*","FRM-807*","FRM-808*","FRM-809*",
  "FRM-811*",
  "SOP-107*","SOP-108*"
];
// Manager-level extras: full system SOPs, RACI, authority, dept handbooks, audit & improvement
const _MGR = [
  "SOP-1*","SOP-9*",
  "DEPT*",
  "JD*","ANNEX*",
  "ANNEX-120*","ANNEX-121*","ANNEX-122*","ANNEX-123*",
  "LAB*",
  "FRM-1*","FRM-9*",
  "SOP-801*","SOP-804*","FRM-812*",
  "WI-901*"
];

const ROLE_DOCS = {
  // ═══ EXECUTIVE — Full access ═══
  ceo: "ALL",
  production_director: "ALL",

  // ═══ PRODUCTION ═══
  cnc_workshop_manager: [
    ..._UNI, ..._MGR,
    "SOP-5*","WI-5*","FRM-5*",
    "SOP-6*","WI-6*","WI-2*","FRM-6*",
    "SOP-3*","FRM-3*",
    "SOP-7*","WI-7*","FRM-7*",
    "SOP-201-*","SOP-202-*","SOP-203-*","FRM-2*",
    "SOP-4*","FRM-4*",
    "SOP-802-*","SOP-803-*","FRM-821-*",
    "WI-8*"
  ],
  shift_leader: [
    ..._UNI,
    "SOP-101-*","SOP-103-*","SOP-106-*",
    "SOP-5*","WI-5*","FRM-5*",
    "SOP-601-*","SOP-603-*","SOP-604-*","SOP-605-*","SOP-606-*",
    "WI-6*","WI-2*",
    "FRM-601-*","FRM-602-*","FRM-621-*","FRM-631-*","FRM-641-*","FRM-642-*","FRM-651-*","FRM-652-*",
    "SOP-701-*","SOP-702-*","SOP-703-*","WI-7*","FRM-7*",
    "WI-8*",
    "FRM-301-*","FRM-302-*","FRM-311-*",
    "DEPT-PRODUCTION-*"
  ],
  setup_technician: [
    ..._UNI,
    "SOP-101-*","SOP-103-*",
    "SOP-502-*","SOP-503-*","SOP-501-*",
    "WI-5*","FRM-511-*","FRM-512-*","FRM-513-*","FRM-514-*","FRM-504-*","FRM-502-*",
    "SOP-601-*","SOP-604-*","SOP-606-*",
    "WI-6*","FRM-601-*","FRM-631-*","FRM-651-*",
    "SOP-702-*","SOP-703-*","WI-721-*",
    "FRM-302-*","FRM-311-*",
    "WI-8*","DEPT-PRODUCTION-*"
  ],
  cnc_operator: [
    ..._UNI,
    "SOP-502-*",
    "WI-511-*","WI-512-*","WI-513-*","WI-514-*","WI-515-*","WI-516-*",
    "WI-501-*","WI-504-*",
    "FRM-511-*","FRM-512-*","FRM-504-*","FRM-502-*","FRM-513-*",
    "SOP-606-*","FRM-651-*",
    "SOP-702-*","SOP-703-*","WI-721-*",
    "SOP-802-*",
    "WI-8*","DEPT-PRODUCTION-*"
  ],
  deburr_team_lead: [
    ..._UNI,
    "SOP-101-*","SOP-103-*",
    "SOP-502-*","SOP-501-*",
    "WI-5*","FRM-5*",
    "SOP-601-*","SOP-606-*","WI-6*",
    "FRM-601-*","FRM-621-*","FRM-651-*","FRM-641-*",
    "SOP-702-*","SOP-703-*","WI-7*","FRM-7*",
    "WI-8*","DEPT-PRODUCTION-*"
  ],
  deburr_technician: [
    ..._UNI,
    "SOP-502-*",
    "WI-501-*","WI-504-*","WI-516-*",
    "FRM-504-*","FRM-502-*",
    "SOP-606-*","FRM-651-*",
    "SOP-702-*","SOP-703-*","WI-721-*",
    "WI-601-*",
    "WI-8*","DEPT-PRODUCTION-*"
  ],
  production_planner: [
    ..._UNI,
    "SOP-101-*","SOP-103-*","SOP-106-*",
    "SOP-501-*","SOP-502-*",
    "WI-501-*","WI-502-*","WI-503-*","WI-504-*","WI-505-*",
    "FRM-501-*","FRM-502-*","FRM-503-*","FRM-504-*",
    "SOP-201-*",
    "FRM-201-*","FRM-202-*","FRM-203-*","FRM-204-*","FRM-205-*","FRM-206-*",
    "SOP-4*","FRM-401-*",
    "SOP-701-*","FRM-7*",
    "WI-901-*",
    "DEPT-PRODUCTION-*"
  ],
  cleaning_packaging_supervisor: [
    ..._UNI,
    "SOP-101-*","SOP-103-*",
    "SOP-702-*","SOP-703-*","SOP-701-*",
    "WI-711-*","WI-712-*","WI-713-*","WI-721-*","WI-701-*","WI-702-*",
    "FRM-7*",
    "SOP-605-*","SOP-606-*",
    "FRM-641-*","FRM-642-*","FRM-651-*",
    "SOP-502-*","WI-504-*",
    "WI-601-*","WI-8*","DEPT-PRODUCTION-*"
  ],
  cleaning_packaging_technician: [
    ..._UNI,
    "SOP-702-*","SOP-703-*",
    "WI-711-*","WI-712-*","WI-713-*","WI-721-*","WI-701-*",
    "FRM-709-*","FRM-711-*","FRM-712-*","FRM-708-*","FRM-707-*",
    "SOP-606-*","FRM-651-*",
    "WI-601-*","WI-8*","DEPT-PRODUCTION-*"
  ],
  maintenance_technician: [
    ..._UNI,
    "SOP-503-*","SOP-601-*",
    "FRM-521-*","FRM-522-*","FRM-523-*","FRM-524-*","FRM-525-*",
    "FRM-512-*","FRM-513-*",
    "FRM-601-*","FRM-602-*",
    "SOP-502-*","WI-516-*",
    "SOP-802-*",
    "WI-8*","DEPT-PRODUCTION-*"
  ],

  // ═══ ENGINEERING ═══
  engineering_lead: [
    ..._UNI, ..._MGR,
    "SOP-3*","FRM-3*",
    "SOP-5*","WI-5*","FRM-5*",
    "SOP-6*","WI-6*","WI-2*","FRM-6*",
    "SOP-2*","FRM-2*",
    "SOP-7*","WI-7*","FRM-7*",
    "SOP-4*","FRM-4*",
    "WI-8*","WI-9*"
  ],
  process_engineer: [
    ..._UNI,
    "SOP-101-*","SOP-103-*","SOP-104-*","SOP-106-*",
    "SOP-3*","FRM-3*",
    "SOP-502-*","SOP-501-*","SOP-503-*",
    "WI-5*","FRM-511-*","FRM-512-*","FRM-513-*","FRM-514-*","FRM-502-*",
    "SOP-6*",
    "WI-6*","FRM-6*",
    "SOP-702-*","SOP-703-*","WI-7*",
    "FRM-7*","WI-2*","WI-8*",
    "REF-*","DEPT-ENGINEERING-*"
  ],
  cam_nc_programmer: [
    ..._UNI,
    "SOP-101-*","SOP-103-*","SOP-106-*",
    "SOP-301-*","SOP-302-*",
    "FRM-301-*","FRM-302-*","FRM-303-*","FRM-304-*","FRM-305-*","FRM-311-*",
    "SOP-502-*",
    "WI-5*",
    "FRM-511-*","FRM-512-*","FRM-513-*","FRM-514-*",
    "SOP-604-*","SOP-606-*",
    "FRM-631-*","FRM-651-*",
    "SOP-702-*","WI-721-*",
    "WI-8*","DEPT-ENGINEERING-*"
  ],

  // ═══ QUALITY ═══
  qa_manager: "ALL",
  quality_engineer: [
    ..._UNI, ..._MGR,
    "SOP-6*","WI-6*","WI-2*","FRM-6*",
    "SOP-3*","FRM-3*",
    "SOP-5*","WI-5*","FRM-5*",
    "SOP-2*","FRM-2*",
    "SOP-4*","FRM-4*",
    "SOP-7*","WI-7*","FRM-7*",
    "WI-8*","WI-9*"
  ],
  qc_inspector: [
    ..._UNI,
    "SOP-101-*","SOP-103-*","SOP-104-*",
    "SOP-6*","WI-6*","WI-2*","FRM-6*",
    "SOP-302-*","FRM-305-*","FRM-311-*","FRM-302-*",
    "SOP-502-*","WI-5*","FRM-511-*","FRM-504-*",
    "SOP-701-*","SOP-702-*","SOP-703-*",
    "WI-7*","FRM-7*",
    "SOP-402-*","FRM-411-*","FRM-412-*","FRM-413-*",
    "WI-8*","DEPT-QUALITY-*"
  ],
  qms_engineer: "ALL",
  internal_auditor: "ALL",

  // ═══ SUPPLY CHAIN ═══
  supply_chain_manager: [
    ..._UNI, ..._MGR,
    "SOP-4*","FRM-4*",
    "SOP-7*","WI-7*","FRM-7*",
    "SOP-201-*","SOP-203-*",
    "FRM-2*",
    "SOP-3*","FRM-301-*",
    "SOP-502-*","SOP-501-*",
    "FRM-501-*","FRM-502-*","FRM-503-*",
    "SOP-605-*","FRM-641-*","FRM-642-*",
    "WI-2*","WI-5*","WI-8*","WI-9*",
    "SOP-803-*","FRM-821-*"
  ],
  buyer: [
    ..._UNI,
    "SOP-101-*","SOP-103-*","SOP-104-*",
    "SOP-401-*","SOP-402-*",
    "FRM-401-*","FRM-402-*","FRM-403-*","FRM-404-*","FRM-405-*",
    "FRM-406-*","FRM-407-*","FRM-408-*","FRM-409-*",
    "FRM-411-*","FRM-412-*","FRM-413-*",
    "SOP-201-*",
    "FRM-201-*","FRM-202-*",
    "SOP-701-*","FRM-701-*","FRM-702-*",
    "SOP-803-*","FRM-821-*",
    "DEPT-SUPPLY-CHAIN-*"
  ],
  warehouse_clerk: [
    ..._UNI,
    "SOP-701-*","SOP-702-*","SOP-703-*",
    "WI-701-*","WI-702-*",
    "FRM-701-*","FRM-702-*","FRM-703-*","FRM-704-*","FRM-705-*","FRM-706-*","FRM-707-*","FRM-708-*",
    "SOP-402-*","FRM-412-*","FRM-413-*",
    "SOP-502-*",
    "FRM-502-*","FRM-503-*",
    "DEPT-SUPPLY-CHAIN-*"
  ],
  tool_storekeeper: [
    ..._UNI,
    "SOP-503-*","SOP-701-*",
    "WI-701-*",
    "FRM-523-*","FRM-525-*","FRM-513-*",
    "FRM-701-*","FRM-703-*","FRM-704-*","FRM-705-*",
    "SOP-601-*","FRM-601-*","FRM-602-*",
    "DEPT-SUPPLY-CHAIN-*"
  ],
  logistics_coordinator: [
    ..._UNI,
    "SOP-701-*","SOP-703-*",
    "WI-702-*","WI-505-*","WI-701-*",
    "FRM-701-*","FRM-702-*","FRM-706-*","FRM-707-*","FRM-709-*",
    "SOP-605-*","FRM-641-*","FRM-642-*",
    "SOP-201-*","SOP-203-*",
    "FRM-205-*","FRM-206-*","FRM-221-*",
    "DEPT-SUPPLY-CHAIN-*"
  ],

  // ═══ SALES ═══
  estimator: [
    ..._UNI,
    "SOP-101-*","SOP-103-*","SOP-104-*",
    "SOP-201-*","SOP-202-*","SOP-203-*",
    "FRM-201-*","FRM-202-*","FRM-203-*","FRM-204-*","FRM-205-*","FRM-206-*","FRM-207-*",
    "FRM-211-*","FRM-212-*","FRM-213-*","FRM-221-*",
    "SOP-301-*","FRM-301-*","FRM-303-*","FRM-304-*",
    "SOP-401-*","FRM-401-*",
    "SOP-605-*","FRM-654-*",
    "SOP-803-*","FRM-821-*",
    "DEPT-SALES-*"
  ],
  customer_service: [
    ..._UNI,
    "SOP-201-*","SOP-202-*","SOP-203-*",
    "FRM-201-*","FRM-202-*","FRM-211-*","FRM-212-*","FRM-213-*","FRM-221-*",
    "FRM-654-*",
    "SOP-605-*","FRM-641-*","FRM-642-*",
    "SOP-803-*","FRM-821-*",
    "DEPT-SALES-*"
  ],

  // ═══ FINANCE ═══
  finance_manager: [
    ..._UNI, ..._MGR,
    "SOP-803-*","FRM-821-*",
    "SOP-201-*","FRM-201-*","FRM-202-*","FRM-206-*",
    "SOP-401-*","FRM-401-*","FRM-405-*",
    "FRM-301-*",
    "WI-503-*","WI-901-*"
  ],
  gl_payroll_accountant: [
    ..._UNI,
    "SOP-101-*","SOP-104-*","SOP-105-*",
    "SOP-803-*","FRM-821-*",
    "FRM-301-*",
    "SOP-801-*",
    "DEPT-FINANCE-*"
  ],
  ap_ar_accountant: [
    ..._UNI,
    "SOP-101-*","SOP-104-*",
    "SOP-803-*","FRM-821-*",
    "SOP-401-*","FRM-401-*",
    "FRM-201-*","FRM-206-*",
    "DEPT-FINANCE-*"
  ],

  // ═══ HR ═══
  hr_manager: [
    ..._UNI, ..._MGR,
    "SOP-801-*","SOP-802-*","SOP-804-*",
    "FRM-8*",
    "SOP-201-*",
    "WI-5*","WI-8*","WI-9*"
  ],

  // ═══ EHS ═══
  ehs_specialist: [
    ..._UNI,
    "SOP-101-*","SOP-103-*","SOP-104-*","SOP-106-*",
    "SOP-802-*","SOP-804-*",
    "FRM-811-*","FRM-812-*",
    "SOP-503-*",
    "FRM-521-*","FRM-522-*",
    "SOP-702-*","SOP-703-*",
    "WI-711-*","WI-713-*","WI-721-*",
    "FRM-708-*",
    "ANNEX-607*","ANNEX-112*","ANNEX-608*",
    "LAB*","DEPT-EHS-*",
    "WI-8*"
  ],

  // ═══ IT ═══
  it_admin: "ALL",
  epicor_admin: [
    ..._UNI, ..._MGR,
    "SOP-104-*","SOP-105-*",
    "ANNEX-131*","ANNEX-132*","ANNEX-133*","ANNEX-134*","ANNEX-110*","ANNEX-113*","ANNEX-114*","ANNEX-115*","ANNEX-117*","ANNEX-101*","ANNEX-102*","ANNEX-503*",
    "SOP-201-*","SOP-501-*",
    "SOP-401-*","SOP-803-*",
    "FRM-1*","FRM-2*","FRM-4*","FRM-5*",
    "WI-5*","WI-9*",
    "DEPT-IT-*","DEPT-EPICOR-*"
  ]
};

function normalizeDocPattern(pattern){
  const raw = String(pattern||'').trim().toUpperCase();
  if(!raw) return [];
  const base = raw.replace(/-\*$/,'*');
  const out = new Set([base]);
  const aliasMap = {
    'AUTHORITY-MATRIX':'ANNEX-120',
    'RACI-MASTER-MATRIX':'ANNEX-121',
    'ANNEX-HR-LAB*':'LAB*',
    'ANNEX-JOB*':'JD*',
    'ANNEX-108*':'ANNEX-131*',
    'ANNEX-109*':'ANNEX-132*',
    'ANNEX-116*':'ANNEX-133*',
    'ANNEX-125*':'ANNEX-134*',
    'REF-001*':'ANNEX-105*',
    'REF-002*':'ANNEX-106*',
    'REF-005*':'ANNEX-117*',
    'REF-006*':'ANNEX-607*',
    'REF-007*':'ANNEX-112*',
    'REF-008*':'ANNEX-608*',
    'REF-010*':'ANNEX-131*',
    'REF-011*':'ANNEX-132*',
    'REF-012*':'ANNEX-113*',
    'REF-013*':'ANNEX-115*',
    'REF-014*':'ANNEX-132*',
    'REF-015*':'ANNEX-114*',
    'REF-020*':'ANNEX-503*',
    'REF-021*':'ANNEX-119*'
  };
  if(aliasMap[base]) out.add(aliasMap[base]);
  if(base === 'REF*' || base === 'REF-*') out.add('ANNEX*');
  if(base === 'REF-01*'){
    ['ANNEX-131*','ANNEX-132*','ANNEX-133*','ANNEX-134*','ANNEX-110*','ANNEX-113*','ANNEX-114*','ANNEX-115*','ANNEX-101*','ANNEX-102*'].forEach(v=>out.add(v));
  }
  return Array.from(out);
}
function docCodeMatchesPattern(docCode, pattern){
  const code = String(docCode||'').trim().toUpperCase();
  if(!code) return false;
  return normalizeDocPattern(pattern).some(p=>p.endsWith('*') ? code.startsWith(p.slice(0,-1)) : code===p);
}
function expandPatternToDocCodes(pattern, docs){
  const source = Array.isArray(docs) ? docs : (Array.isArray(DOCS) ? DOCS : []);
  return source.filter(d=>d && docCodeMatchesPattern(d.code, pattern)).map(d=>d.code);
}

// Immutable admin whitelist — UI edits to ROLES cannot bypass this
const ADMIN_ROLES = Object.freeze(['admin','ceo','qa_manager','it_admin']);
function isAdmin(){ return currentUser && ADMIN_ROLES.includes(currentUser.role); }

// Permission overrides stored per user (from admin panel)
let PERM_OVERRIDES = {};
function loadPermOverrides(){
  PERM_OVERRIDES = {};
  try{ sessionStorage.removeItem('hesem_perm_overrides'); }catch(e){}
}
function savePermOverrides(){ return true; }
function loadUsersFromStorage(){
  try{ sessionStorage.removeItem('hesem_users_db'); }catch(e){}
}
function saveUsersToStorage(){ return true; }
function saveRoleDocsToStorage(){
  try{ sessionStorage.removeItem('hesem_role_docs'); }catch(e){}
  return true;
}
function loadRoleDocsFromStorage(){
  try{ sessionStorage.removeItem('hesem_role_docs'); }catch(e){}
}
loadPermOverrides();
loadUsersFromStorage();
loadRoleDocsFromStorage();

const CATEGORIES = [
  // ── Tài liệu hệ thống ── (mom/docs/system)
  {id:"MAN",icon:"📘",label:"Sổ tay QMS (Manual)",color:"var(--blue,#1e40af)",dept:"QMS",section:"system"},
  {id:"POL",icon:"📜",label:"Chính sách (Policy)",color:"var(--purple-light,#7c3aed)",dept:"QMS",section:"system"},
  {id:"ORG",icon:"🏢",label:"Tổ chức & RACI",color:"var(--text-secondary,#475569)",dept:"ORG",section:"system"},
  // ── Tài liệu vận hành ── (mom/docs/operations + mom/docs/forms)
  {id:"SOP",icon:"📋",label:"Quy trình (SOP)",color:"var(--cyan,#0369a1)",dept:"QMS",section:"ops"},
  {id:"WI",icon:"📖",label:"Hướng dẫn (WI/OPS)",color:"var(--green-dark,#059669)",dept:"OPS",section:"ops"},
  {id:"ANNEX",icon:"📚",label:"Phụ lục (ANNEX)",color:"var(--purple-light,#6366f1)",dept:"QMS",section:"ops"},
  {id:"FRM",icon:"📝",label:"Biểu mẫu (Forms)",color:"var(--amber-light,#d97706)",dept:"FRM",section:"ops"},
  // ── Đào tạo & Năng lực ──
  {id:"TRN",icon:"🎓",label:"Đào tạo (Training)",color:"var(--purple,#9333ea)",dept:"TRN",section:"train"},
  // ── Ẩn ──
  {id:"DICT",icon:"📖",label:"Từ điển thuật ngữ",color:"var(--cyan-light,#0ea5e9)",dept:"DICT",hidden:true},
];

// ═══════════════════════════════════════════════════
// ICON LIBRARY — Smart icons for documents & folders
// ═══════════════════════════════════════════════════
const ICON_LIBRARY = {
  docs: [
    {icon:'📋',label:'SOP / Quy trình'},{icon:'📘',label:'Manual / Sổ tay'},{icon:'📜',label:'Policy / Chính sách'},
    {icon:'📝',label:'Form / Biểu mẫu'},{icon:'📄',label:'Document / Tài liệu'},{icon:'📖',label:'Guide / Hướng dẫn'},
    {icon:'📎',label:'Annex / Phụ lục'},{icon:'📑',label:'Report / Báo cáo'},{icon:'📊',label:'Chart / Biểu đồ'},
    {icon:'📈',label:'KPI'},{icon:'📉',label:'Analysis'},{icon:'🧾',label:'Record / Hồ sơ'},
    {icon:'📃',label:'Certificate'},{icon:'📐',label:'Drawing / Bản vẽ'},{icon:'📏',label:'Specification'},
    {icon:'📓',label:'Notebook'},{icon:'📔',label:'Logbook'},{icon:'📕',label:'Red book'},{icon:'📗',label:'Green book'},
    {icon:'📒',label:'Ledger'},{icon:'🗒️',label:'Notepad'},{icon:'🗓️',label:'Calendar'},{icon:'📰',label:'News'},
    {icon:'📚',label:'Books'},{icon:'🏷️',label:'Label'},{icon:'🔖',label:'Bookmark'},{icon:'✉️',label:'Letter'},
    {icon:'📇',label:'Index card'},{icon:'🗞️',label:'Rolled paper'},{icon:'📰',label:'Newspaper'},
  ],
  folders: [
    {icon:'📁',label:'Folder / Thư mục'},{icon:'📂',label:'Open folder'},{icon:'🗂️',label:'File cabinet'},
    {icon:'🗃️',label:'Archive'},{icon:'💼',label:'Briefcase'},{icon:'🏢',label:'Organization'},
    {icon:'🏭',label:'Factory'},{icon:'⚙️',label:'Engineering'},{icon:'🔧',label:'Maintenance'},
    {icon:'📦',label:'Package'},{icon:'🛒',label:'Purchasing'},{icon:'💰',label:'Finance'},
    {icon:'📮',label:'Inbox'},{icon:'🗄️',label:'File drawer'},{icon:'🏠',label:'Home'},{icon:'🌐',label:'Web'},
    {icon:'🧳',label:'Suitcase'},{icon:'🎒',label:'Backpack'},{icon:'🔐',label:'Secured'},
  ],
  departments: [
    {icon:'👔',label:'Director'},{icon:'🛡️',label:'QA/QC'},{icon:'⚡',label:'Operations'},
    {icon:'👥',label:'HR'},{icon:'🦺',label:'HSE'},{icon:'🖥️',label:'IT'},
    {icon:'📅',label:'Planning'},{icon:'🎓',label:'Training'},{icon:'🔬',label:'Lab'},
    {icon:'🔩',label:'CNC'},{icon:'💼',label:'Sales'},{icon:'📦',label:'Warehouse'},
    {icon:'🛒',label:'Purchasing'},{icon:'💰',label:'Finance'},{icon:'🔧',label:'Maintenance'},
    {icon:'👷',label:'Worker'},{icon:'👤',label:'Person'},{icon:'👨‍💼',label:'Manager'},
    {icon:'👩‍💼',label:'Female Manager'},{icon:'👨‍🔧',label:'Technician'},{icon:'👩‍🔬',label:'Scientist'},
    {icon:'👨‍🏭',label:'Factory Worker'},{icon:'👨‍💻',label:'Developer'},{icon:'👩‍⚕️',label:'Officer'},
  ],
  tools: [
    {icon:'🔍',label:'Inspect'},{icon:'✅',label:'Approved'},{icon:'⚠️',label:'Warning'},
    {icon:'❌',label:'Reject'},{icon:'🔒',label:'Locked'},{icon:'🔑',label:'Access'},
    {icon:'⏱️',label:'Timer'},{icon:'📌',label:'Pin'},{icon:'🏷️',label:'Tag'},
    {icon:'💡',label:'Idea'},{icon:'🎯',label:'Target'},{icon:'🔔',label:'Alert'},
    {icon:'🔗',label:'Link'},{icon:'📍',label:'Location'},{icon:'🧲',label:'Magnet'},
    {icon:'⚖️',label:'Legal'},{icon:'🗝️',label:'Key'},{icon:'🛑',label:'Stop'},
    {icon:'🔄',label:'Refresh'},{icon:'⏰',label:'Alarm'},{icon:'📤',label:'Upload'},
    {icon:'📥',label:'Download'},{icon:'🔎',label:'Search'},{icon:'🔀',label:'Shuffle'},
    {icon:'⬆️',label:'Up'},{icon:'⬇️',label:'Down'},{icon:'↩️',label:'Return'},
  ],
  industry: [
    {icon:'🔩',label:'CNC'},{icon:'🧪',label:'Chemical'},{icon:'🔬',label:'Metrology'},
    {icon:'💻',label:'Programming'},{icon:'🧹',label:'Clean'},{icon:'🛠️',label:'Repair'},
    {icon:'📡',label:'Semiconductor'},{icon:'🔥',label:'Heat treat'},{icon:'💎',label:'Surface'},
    {icon:'📐',label:'CAD/CAM'},{icon:'👷',label:'Worker'},{icon:'👤',label:'Person'},
    {icon:'🏗️',label:'Construction'},{icon:'⛏️',label:'Mining'},{icon:'🧊',label:'Cooling'},
    {icon:'🔋',label:'Energy'},{icon:'🧲',label:'Magnetic'},{icon:'🔌',label:'Electric'},
    {icon:'⚗️',label:'Chemistry'},{icon:'🧬',label:'DNA'},{icon:'🔭',label:'Telescope'},
    {icon:'🧮',label:'Calculator'},{icon:'⛽',label:'Fuel'},{icon:'🪨',label:'Material'},
  ],
  objects: [
    {icon:'🚗',label:'Car'},{icon:'✈️',label:'Airplane'},{icon:'🚀',label:'Rocket'},
    {icon:'🏆',label:'Trophy'},{icon:'🎖️',label:'Medal'},{icon:'🥇',label:'1st place'},
    {icon:'💎',label:'Diamond'},{icon:'🔔',label:'Bell'},{icon:'📱',label:'Phone'},
    {icon:'💻',label:'Laptop'},{icon:'🖨️',label:'Printer'},{icon:'📷',label:'Camera'},
    {icon:'🎬',label:'Film'},{icon:'🎵',label:'Music'},{icon:'🎨',label:'Art'},
    {icon:'🧰',label:'Toolbox'},{icon:'🔭',label:'Telescope'},{icon:'🔮',label:'Crystal'},
    {icon:'🎲',label:'Dice'},{icon:'🧩',label:'Puzzle'},{icon:'🎁',label:'Gift'},
    {icon:'🪙',label:'Coin'},{icon:'💳',label:'Card'},{icon:'📧',label:'Email'},
    {icon:'🏠',label:'House'},{icon:'🏥',label:'Hospital'},{icon:'🏫',label:'School'},
    {icon:'🏛️',label:'Government'},{icon:'🏪',label:'Store'},{icon:'🚢',label:'Ship'},
    {icon:'🚌',label:'Bus'},{icon:'🚁',label:'Helicopter'},{icon:'🏍️',label:'Motorcycle'},
  ],
  symbols: [
    {icon:'⭐',label:'Star'},{icon:'🌟',label:'Glow star'},{icon:'💫',label:'Dizzy'},
    {icon:'✨',label:'Sparkle'},{icon:'🔥',label:'Fire'},{icon:'💧',label:'Water'},
    {icon:'❤️',label:'Heart'},{icon:'💚',label:'Green'},{icon:'💙',label:'Blue'},
    {icon:'🟢',label:'Green ●'},{icon:'🔵',label:'Blue ●'},{icon:'🟡',label:'Yellow ●'},
    {icon:'🔴',label:'Red ●'},{icon:'🟣',label:'Purple ●'},{icon:'⚪',label:'White ●'},
    {icon:'🟩',label:'Green ■'},{icon:'🟦',label:'Blue ■'},{icon:'🟨',label:'Yellow ■'},
    {icon:'♻️',label:'Recycle'},{icon:'☢️',label:'Radioactive'},{icon:'⚛️',label:'Atom'},
    {icon:'🔰',label:'Beginner'},{icon:'♾️',label:'Infinity'},{icon:'💯',label:'100'},
    {icon:'➕',label:'Plus'},{icon:'❗',label:'!'},{icon:'❓',label:'?'},
    {icon:'🆗',label:'OK'},{icon:'🆕',label:'New'},{icon:'🆙',label:'Up'},
  ],
  nature: [
    {icon:'🌍',label:'Earth'},{icon:'🌞',label:'Sun'},{icon:'🌙',label:'Moon'},
    {icon:'⚡',label:'Lightning'},{icon:'🌈',label:'Rainbow'},{icon:'🌊',label:'Wave'},
    {icon:'🌲',label:'Tree'},{icon:'🌸',label:'Cherry'},{icon:'🍀',label:'Clover'},
    {icon:'🦋',label:'Butterfly'},{icon:'🐝',label:'Bee'},{icon:'🦅',label:'Eagle'},
    {icon:'🐉',label:'Dragon'},{icon:'🦁',label:'Lion'},{icon:'🐺',label:'Wolf'},
    {icon:'🐬',label:'Dolphin'},{icon:'🦈',label:'Shark'},{icon:'🌺',label:'Hibiscus'},
    {icon:'🌻',label:'Sunflower'},{icon:'🌿',label:'Herb'},{icon:'🍃',label:'Leaf'},
    {icon:'🍂',label:'Autumn'},{icon:'❄️',label:'Snow'},{icon:'☀️',label:'Sunny'},
  ],
  flags: [
    {icon:'🇻🇳',label:'Việt Nam'},{icon:'🇺🇸',label:'USA'},{icon:'🇯🇵',label:'Japan'},
    {icon:'🇰🇷',label:'Korea'},{icon:'🇨🇳',label:'China'},{icon:'🇹🇼',label:'Taiwan'},
    {icon:'🇸🇬',label:'Singapore'},{icon:'🇩🇪',label:'Germany'},{icon:'🇫🇷',label:'France'},
    {icon:'🇬🇧',label:'UK'},{icon:'🇮🇹',label:'Italy'},{icon:'🇦🇺',label:'Australia'},
    {icon:'🇮🇳',label:'India'},{icon:'🇹🇭',label:'Thailand'},{icon:'🇲🇾',label:'Malaysia'},
    {icon:'🏴',label:'Black flag'},{icon:'🏳️',label:'White flag'},{icon:'🚩',label:'Red flag'},
  ],
  food: [
    {icon:'☕',label:'Coffee'},{icon:'🍵',label:'Tea'},{icon:'🍺',label:'Beer'},
    {icon:'🍕',label:'Pizza'},{icon:'🍔',label:'Burger'},{icon:'🍣',label:'Sushi'},
    {icon:'🍜',label:'Noodles'},{icon:'🍚',label:'Rice'},{icon:'🍰',label:'Cake'},
    {icon:'🍎',label:'Apple'},{icon:'🍊',label:'Orange'},{icon:'🥑',label:'Avocado'},
    {icon:'🌶️',label:'Hot pepper'},{icon:'🧁',label:'Cupcake'},{icon:'🍿',label:'Popcorn'},
  ],
  hands: [
    {icon:'👍',label:'Like'},{icon:'👎',label:'Dislike'},{icon:'👏',label:'Clap'},
    {icon:'🤝',label:'Handshake'},{icon:'✊',label:'Fist'},{icon:'✌️',label:'Victory'},
    {icon:'🤞',label:'Crossed'},{icon:'👋',label:'Wave'},{icon:'🙏',label:'Prayer'},
    {icon:'💪',label:'Muscle'},{icon:'🖐️',label:'Hand'},{icon:'👌',label:'OK'},
    {icon:'☝️',label:'Point up'},{icon:'👈',label:'Point left'},{icon:'👉',label:'Point right'},
  ],
};

const DOC_ICON_MAP = {
  'SOP':'📋','QMS-MAN':'📘','POL':'📜','PROC':'⚙️','WI':'📖',
  'FRM':'📝','ANNEX':'📎','ORG':'🏢','RACI':'📊','TMATRIX':'📈',
  'DICT':'📖','DEP':'🏢','GDL':'💡','LAB':'🔬','TRN':'🎓',
  'FRM-QA':'🛡️','FRM-OPS':'⚡','FRM-ENG':'⚙️','FRM-HR':'👥','FRM-MNT':'🔧',
  'FRM-PUR':'🛒','FRM-HSE':'🦺','FRM-FIN':'💰','FRM-WHS':'📦','FRM-PLA':'📅',
  'FRM-SAL':'💼','FRM-CNC':'🔩','FRM-IT':'🖥️','FRM-QMS':'📋',
  'PROC-QA':'🛡️','PROC-CNC':'🔩','PROC-ENG':'⚙️','PROC-OPS':'⚡',
  'PROC-MNT':'🔧','PROC-PUR':'🛒','PROC-HR':'👥','PROC-HSE':'🦺',
  'PROC-FIN':'💰','PROC-PLA':'📅','PROC-SAL':'💼','PROC-WHS':'📦','PROC-IT':'🖥️',
  'WI-CNC':'🔩','WI-OPS':'⚡',
  'ANNEX-QMS':'📋','ANNEX-QA':'🛡️','ANNEX-ENG':'⚙️','ANNEX-OPS':'⚡',
  'ANNEX-PUR':'🛒','ANNEX-WHS':'📦','ANNEX-HR':'👥','ANNEX-HSE':'🦺','ANNEX-IT':'🖥️',
  'C':'🎓','SYS-OPS':'📖','TRN-OPS':'🎓','MRR':'🎯',
};

const FOLDER_ICON_MAP = {
  // System docs
  'mom/docs/system':'📂','mom/docs/operations':'📂','mom/docs/forms':'📝',
  '01-Quality-Manual':'📘','02-Policies-Objectives':'📜','03-Organization':'🏢',
  // SOP series (by department)
  '01-SOPs':'📋',
  '01-SOP-100':'🏛️','02-SOP-200':'💼','03-SOP-300':'⚙️','04-SOP-400':'🔗',
  '05-SOP-500':'🏭','06-SOP-600':'🔍','07-SOP-700':'📦','08-SOP-800':'👥',
  '09-SOP-900':'♻️',
  // WI series (by department)
  '02-Work-Instructions':'📖',
  '01-WI-100':'📋','02-WI-200':'💰','03-WI-300':'🛠️','04-WI-400':'🛒',
  '05-WI-500':'🔧','06-WI-600':'🔬','07-WI-700':'📦','08-WI-800':'🦺',
  '09-WI-900':'📊',
  // ANNEX series (by department — matches SOP/WI/FRM numbering)
  '03-Reference':'📚',
  '01-ANNEX-100':'🏛️','02-ANNEX-200':'💼','03-ANNEX-300':'⚙️','04-ANNEX-400':'🔗',
  '10-ANNEX-100-Foundation-Maps-and-Control':'🧭',
  '11-ANNEX-110-Digital-Control-and-Resilience':'🖥️',
  '12-ANNEX-120-Authority-KPI-and-Deputy-Control':'🧩',
  '13-ANNEX-130-M365-Records-Control':'🗂️',
  '05-ANNEX-500':'🏭','06-ANNEX-600':'🔍','07-ANNEX-700':'📦','08-ANNEX-800':'👥',
  '09-ANNEX-900':'♻️',
  // Forms series (by department)
  '01-FRM-100':'🏛️','02-FRM-200':'💼','03-FRM-300':'⚙️','04-FRM-400':'🔗',
  '05-FRM-500':'🏭','06-FRM-600':'🔍','07-FRM-700':'📦','08-FRM-800':'👥',
  '09-FRM-900':'♻️',
  // Competency Levels (C01-C19)
  '01-C01-Safety-5S':'🦺','02-C02-Process-Discipline':'📋','03-C03-Right-First-Time':'🎯',
  '04-C04-Cross-Dept-Communication':'🤝','05-C05-Customer-Service-B2B':'🤵',
  '06-C06-Problem-Solving-RCA':'🔍','07-C07-Kaizen-Lean':'♻️',
  '08-C08-Data-Driven-ERP':'📊','09-C09-Time-Management':'⏱️',
  '10-C10-CNC-Job-Order-Process':'🔩','11-C11-Sales-Contract-Review':'💼',
  '12-C12-Estimating-Costing':'💰','13-C13-Risk-Revision-Control':'⚠️',
  '14-C14-Drawing-GDT':'📐','15-C15-Material-Science':'🧪',
  '16-C16-Advanced-Metrology':'🔬','17-C17-CNC-Setup-CAM':'⚙️',
  '18-C18-Supply-Chain':'🛒','19-C19-Leadership-Coaching':'👨‍🏫',
  // Organization
  '01-Org-Chart':'📊','02-Department-Handbooks':'📕','03-Job-Descriptions':'👔',
  '04-RACI-Authority':'🔑','05-Labor-Relations':'⚖️',
  // JD departments
  '01-JD-Executive':'👔','02-JD-Production':'🏭','03-JD-Engineering':'⚙️',
  '04-JD-Quality':'🛡️','05-JD-Supply-Chain':'🛒','06-JD-Sales':'💼',
  '07-JD-Finance':'💰','08-JD-HR':'👥','09-JD-EHS':'🦺','10-JD-IT':'🖥️',
  // Training
  '01-Competency-System':'🎯','02-Training-Content':'📚','03-System-Operations':'⚡',
  '04-Templates-Tools':'🧰',
  '01-Framework':'🏗️','02-Levels':'📈','03-Matrices':'📊',
  '01-Modules':'📘','02-OJT-Guides':'🤝','03-Practice-Drills':'🎯',
  '01-System-Guides':'📖','02-Training-Ops':'⚙️','03-MRR-Pack':'📦',
};

let CUSTOM_ICONS = {};
try{const ci=sessionStorage.getItem('hesem_custom_icons');if(ci)CUSTOM_ICONS=JSON.parse(ci);}catch(e){}
function saveCustomIcons(){try{sessionStorage.setItem('hesem_custom_icons',JSON.stringify(CUSTOM_ICONS));}catch(e){}}

function getDocIcon(code){
  if(CUSTOM_ICONS['doc:'+code]) return CUSTOM_ICONS['doc:'+code];
  try{
    const doc = Array.isArray(DOCS) ? DOCS.find(d=>String(d.code||'').toUpperCase()===String(code||'').toUpperCase()) : null;
    if(doc && (/(xlsx|xlsm|xls|csv)/i.test(String(doc.ext||'')) || doc.delivery_mode==='download' || /\.(xlsx|xlsm|xls|csv)$/i.test(String(doc.path||'')))) return '📊';
  }catch(e){}
  let best='📄',bestLen=0;
  for(const [prefix,icon] of Object.entries(DOC_ICON_MAP)){
    if(code.startsWith(prefix)&&prefix.length>bestLen){best=icon;bestLen=prefix.length;}
  }
  return best;
}
function getFolderIcon(folderName){
  if(CUSTOM_ICONS['folder:'+folderName]) return CUSTOM_ICONS['folder:'+folderName];
  if(FOLDER_ICON_MAP[folderName]) return FOLDER_ICON_MAP[folderName];
  // Auto-detect department from folder name keywords
  const fn = folderName.toLowerCase();
  if(fn.includes('cnc') || fn.includes('machining')) return '🔩';
  if(fn.includes('eng') && !fn.includes('danger')) return '⚙️';
  if(fn.includes('fin') || fn.includes('finance') || fn.includes('accounting')) return '💰';
  if(fn.includes('hr') || fn.includes('human') || fn.includes('nhân sự')) return '👥';
  if(fn.includes('hse') || fn.includes('safety') || fn.includes('an toàn')) return '🦺';
  if(fn.includes('-it') || fn.includes('it-') || fn === 'it' || fn.includes('công nghệ')) return '🖥️';
  if(fn.includes('mnt') || fn.includes('maintenance') || fn.includes('bảo trì')) return '🔧';
  if(fn.includes('ops') || fn.includes('operation') || fn.includes('vận hành')) return '⚡';
  if(fn.includes('pla') || fn.includes('planning') || fn.includes('kế hoạch')) return '📅';
  if(fn.includes('pur') || fn.includes('purchasing') || fn.includes('mua hàng')) return '🛒';
  if(fn.includes('qa') || fn.includes('quality') || fn.includes('chất lượng')) return '🛡️';
  if(fn.includes('sal') || fn.includes('sales') || fn.includes('kinh doanh')) return '💼';
  if(fn.includes('whs') || fn.includes('warehouse') || fn.includes('kho')) return '📦';
  if(fn.includes('trn') || fn.includes('training') || fn.includes('đào tạo')) return '🎓';
  if(fn.includes('pro') || fn.includes('production') || fn.includes('sản xuất')) return '🏭';
  if(fn.includes('lab') || fn.includes('metrology')) return '🔬';
  if(fn.includes('org') || fn.includes('organization') || fn.includes('tổ chức')) return '🏢';
  if(fn.includes('jd') || fn.includes('job-desc') || fn.includes('mô tả')) return '👤';
  if(fn.includes('raci') || fn.includes('authority') || fn.includes('matrix')) return '📊';
  if(fn.includes('competency') || fn.includes('năng lực')) return '🎯';
  if(fn.includes('module') || fn.includes('guide') || fn.includes('hướng dẫn')) return '📖';
  if(fn.includes('template') || fn.includes('tool') || fn.includes('mẫu')) return '🛠️';
  if(fn.includes('drill') || fn.includes('practice') || fn.includes('thực hành')) return '🎯';
  if(fn.includes('annex') || fn.includes('phụ lục')) return '📎';
  if(fn.includes('policy') || fn.includes('chính sách')) return '📜';
  if(fn.includes('sop') || fn.includes('quy trình')) return '📋';
  return '📁';
}

function showIconPicker(targetType, targetId, callback){
  closeModal();
  const modal=document.createElement('div');
  modal.id='icon-picker-modal';modal.className='modal-overlay';
  const catLabels={docs:'📄 Tài liệu',folders:'📁 Thư mục',departments:'🏢 Phòng ban',tools:'🔧 Công cụ',industry:'🏭 Ngành'};
  let gridHtml='';
  Object.entries(ICON_LIBRARY).forEach(([catKey,icons])=>{
    gridHtml+=`<div style="margin-bottom:12px">
      <div style="font-size:11px;font-weight:700;color:var(--text-2);margin-bottom:6px;text-transform:uppercase">${catLabels[catKey]||catKey}</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">
        ${icons.map(ic=>`<button class="icon-pick-btn" onclick="selectIconFromPicker('${targetType}','${escapeHtml(targetId)}','${ic.icon}')" title="${ic.label}"
          style="width:38px;height:38px;border-radius:8px;border:1.5px solid var(--border,#e2e8f0);background:var(--bg-surface,#fff);font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s"
          onmouseenter="this.style.background='#eff6ff';this.style.borderColor='#60a5fa'" onmouseleave="this.style.background='#fff';this.style.borderColor='var(--border,#e2e8f0)'"
        >${ic.icon}</button>`).join('')}
      </div>
    </div>`;
  });
  modal.innerHTML=`
    <div class="modal" style="max-width:520px">
      <div class="modal-header"><div class="modal-title">🎨 ${lang==='en'?'Choose Icon':'Chọn biểu tượng'}</div>
        <button class="icon-btn" onclick="closeIconPicker()" aria-label="Close">✕</button></div>
      <div class="modal-body" style="max-height:450px;overflow-y:auto">
        <div style="margin-bottom:12px;font-size:11px;color:var(--text-3)">
          ${lang==='en'?'Target':'Đối tượng'}: <b>${escapeHtml(targetId)}</b>
          ${CUSTOM_ICONS[targetType+':'+targetId]?' · <a href="#" onclick="resetCustomIcon(\''+targetType+'\',\''+escapeHtml(targetId)+'\');return false" style="color:var(--red-light,#dc2626)">'+(lang==='en'?'Reset':'Mặc định')+'</a>':''}
        </div>
        ${gridHtml}
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)closeIconPicker();});
  window.__iconPickerCallback=callback;
}
function closeIconPicker(){const m=document.getElementById('icon-picker-modal');if(m)m.remove();}
function selectIconFromPicker(type,id,icon){
  CUSTOM_ICONS[type+':'+id]=icon;saveCustomIcons();closeIconPicker();
  if(window.__iconPickerCallback)window.__iconPickerCallback(icon);
  if(typeof renderDocuments==='function')renderDocuments();
  if(typeof renderSidebar==='function')renderSidebar();
  showToast('✅ '+(lang==='en'?'Icon updated':'Đã đổi biểu tượng'));
}
function resetCustomIcon(type,id){
  delete CUSTOM_ICONS[type+':'+id];saveCustomIcons();closeIconPicker();
  if(typeof renderDocuments==='function')renderDocuments();
  if(typeof renderSidebar==='function')renderSidebar();
  showToast('↩ '+(lang==='en'?'Reset':'Mặc định'));
}

// ═══════════════════════════════════════════════════
// LIVE DOCUMENT DATABASE — auto-loaded from server filesystem
// ═══════════════════════════════════════════════════
let DOCS = []; // Populated dynamically from api.php?action=scan_folders
let DOCS_LOADED = false;
const LIVE_DOCS_SYNC_INTERVAL_MS = 10000;
let liveDocsSyncTimer = null;
let liveDocsSyncInFlight = false;
let lastDocsSyncFingerprint = '';

function flattenTreeForSyncFingerprint(nodes, bucket=[]){
  (Array.isArray(nodes) ? nodes : []).forEach(node => {
    if(!node) return;
    bucket.push([
      String(node.path || ''),
      String(node.num ?? ''),
      String(node.fileCount ?? ''),
      String(node.cat || ''),
      String(node.name || '')
    ].join('|'));
    if(Array.isArray(node.subs) && node.subs.length){
      flattenTreeForSyncFingerprint(node.subs, bucket);
    }
  });
  return bucket;
}

function buildDocsSyncFingerprint(docs, tree){
  try{
    const docFingerprint = (Array.isArray(docs) ? docs : []).map(doc => ([
      String(doc?.code || ''),
      String(doc?.path || ''),
      String(doc?.folder || ''),
      String(doc?.ext || ''),
      String(doc?.rev || ''),
      String(doc?.status || ''),
      String(doc?.delivery_mode || ''),
      String(doc?.portal_behavior || ''),
      doc?.browser_open_enabled ? '1' : '0'
    ]).join('|')).join('||');
    const treeFingerprint = flattenTreeForSyncFingerprint(tree, []).join('||');
    return docFingerprint + '###' + treeFingerprint;
  }catch(e){
    return String(Date.now());
  }
}

let portalShellLayoutAssertRaf = 0;
let portalShellLayoutAssertTimer = 0;

function isPortalDocViewerOpen(){
  try{
    const dv = document.getElementById('doc-viewer');
    return !!(dv && dv.classList.contains('active') && currentDoc);
  }catch(e){
    return false;
  }
}

let __QMS_DOC_VIEW_TXN_SEQ = 0;
let __QMS_ACTIVE_DOC_VIEW_TXN = null;

function normalizePortalViewLang(value){
  return value === 'en' ? 'en' : 'vi';
}

function normalizePortalViewPath(path){
  try{
    if(typeof normalizeDocRelativePath === 'function'){
      return normalizeDocRelativePath(path);
    }
  }catch(e){}
  try{
    return String(path || '').trim().replace(/\\/g, '/').replace(/^\/+/, '').replace(/^\.\//, '');
  }catch(e){
    return '';
  }
}

function resolvePortalDocViewIdentity(docOrCode){
  let doc = null;
  try{
    if(docOrCode && typeof docOrCode === 'object'){
      doc = docOrCode;
    }else if(typeof window._resolveDocRecord === 'function'){
      doc = window._resolveDocRecord(docOrCode);
    }else if(Array.isArray(DOCS)){
      const raw = String(docOrCode || '').trim();
      doc = DOCS.find(d => String(d && d.code || '').trim() === raw) || null;
    }
  }catch(e){
    doc = null;
  }
  const code = String((doc && doc.code) || (typeof docOrCode === 'string' ? docOrCode : '') || '').trim();
  const path = normalizePortalViewPath((doc && doc.path) || window.currentDocPath || '');
  return {doc, code, path};
}

function beginPortalDocViewTransaction(reason, docOrCode, langOverride){
  const identity = resolvePortalDocViewIdentity(docOrCode);
  const activeLang = normalizePortalViewLang(langOverride || lang);
  const seq = ++__QMS_DOC_VIEW_TXN_SEQ;
  const token = [seq, activeLang, identity.code, identity.path, Date.now(), Math.random().toString(36).slice(2)].join('|');
  const txn = {
    token,
    seq,
    lang: activeLang,
    code: identity.code,
    path: identity.path,
    reason: String(reason || 'doc-view'),
    createdAt: Date.now()
  };
  __QMS_ACTIVE_DOC_VIEW_TXN = txn;
  try{
    window.__QMS_ACTIVE_DOC_VIEW_TXN = txn;
    window.__DOC_VIEW_RENDER_TOKEN = token;
  }catch(e){}
  return txn;
}

function getPortalDocViewTransaction(){
  return __QMS_ACTIVE_DOC_VIEW_TXN || null;
}

function isPortalDocViewTransactionCurrent(txn, docOrCode, langOverride){
  try{
    if(!txn || !__QMS_ACTIVE_DOC_VIEW_TXN || __QMS_ACTIVE_DOC_VIEW_TXN.token !== txn.token) return false;
    const activeLang = normalizePortalViewLang(langOverride || lang);
    if(activeLang !== txn.lang) return false;
    if(String(currentDoc || '').trim() !== String(txn.code || '').trim()) return false;
    const currentPath = normalizePortalViewPath(window.currentDocPath || '');
    if(txn.path && currentPath && txn.path !== currentPath) return false;
    if(docOrCode){
      const identity = resolvePortalDocViewIdentity(docOrCode);
      if(identity.code && identity.code !== txn.code) return false;
      if(identity.path && txn.path && identity.path !== txn.path) return false;
    }
    return true;
  }catch(e){
    return false;
  }
}

function clearPortalDocViewTransaction(reason){
  try{
    __QMS_ACTIVE_DOC_VIEW_TXN = null;
    window.__QMS_ACTIVE_DOC_VIEW_TXN = null;
    if(reason && window.__QMS_DEBUG_DOC_VIEW_TXN){
      console.debug('[QMS] cleared doc view transaction:', reason);
    }
  }catch(e){}
}

window.beginPortalDocViewTransaction = beginPortalDocViewTransaction;
window.getPortalDocViewTransaction = getPortalDocViewTransaction;
window.isPortalDocViewTransactionCurrent = isPortalDocViewTransactionCurrent;
window.clearPortalDocViewTransaction = clearPortalDocViewTransaction;

function assertPortalShellLayout(reason){
  try{
    const root = document.documentElement;
    const body = document.body;
    if(root) root.scrollLeft = 0;
    if(body) body.scrollLeft = 0;
    if(document.scrollingElement) document.scrollingElement.scrollLeft = 0;
  }catch(e){}
  try{
    const app = document.getElementById('app');
    const main = document.getElementById('main');
    const content = document.getElementById('content');
    const sidebar = document.getElementById('sidebar');
    [app, main, content].forEach(el => {
      if(!el || !el.style) return;
      el.style.removeProperty('left');
      el.style.removeProperty('margin-left');
      el.style.removeProperty('transform');
    });
    if(content) content.scrollLeft = 0;
    if(sidebar && window.innerWidth > 900){
      sidebar.classList.remove('mobile-open');
      sidebar.style.removeProperty('left');
      sidebar.style.removeProperty('margin-left');
      sidebar.style.removeProperty('transform');
    }
  }catch(e){}
  try{
    if(reason && window.__QMS_DEBUG_SHELL_LAYOUT){
      console.debug('[QMS] shell layout asserted:', reason);
    }
  }catch(e){}
}

function schedulePortalShellLayoutAssert(reason){
  try{
    if(portalShellLayoutAssertRaf) cancelAnimationFrame(portalShellLayoutAssertRaf);
    if(portalShellLayoutAssertTimer) clearTimeout(portalShellLayoutAssertTimer);
    const run = () => assertPortalShellLayout(reason || 'scheduled');
    portalShellLayoutAssertRaf = requestAnimationFrame(function(){
      portalShellLayoutAssertRaf = 0;
      run();
      portalShellLayoutAssertTimer = setTimeout(run, 120);
    });
  }catch(e){
    try{ assertPortalShellLayout(reason || 'fallback'); }catch(_e){}
  }
}

window.assertPortalShellLayout = assertPortalShellLayout;
window.schedulePortalShellLayoutAssert = schedulePortalShellLayoutAssert;
window.isPortalDocViewerOpen = isPortalDocViewerOpen;

function refreshPortalDocsUiAfterSync(){
  const viewerOpen = isPortalDocViewerOpen();
  if(!viewerOpen){
    try{ renderSidebar(); }catch(e){}
    try{ if(typeof syncSidebarToggleState==='function') syncSidebarToggleState(); }catch(e){}
    try{
      if(currentPage==='dashboard' && typeof renderDashboard==='function') renderDashboard();
      if(currentPage==='documents' && typeof renderDocuments==='function') renderDocuments();
      if(currentPage==='search' && typeof renderSearch==='function') renderSearch();
      if(currentPage==='dictionary' && typeof renderDictionary==='function') renderDictionary();
      if(currentPage==='access' && typeof renderAccessMatrix==='function') renderAccessMatrix();
      if(currentPage==='admin' && typeof renderAdmin==='function') renderAdmin();
      if(currentPage==='deploy' && typeof renderDeployDashboard==='function') renderDeployDashboard();
    }catch(e){}
  }else{
    try{ if(typeof syncSidebarToggleState==='function') syncSidebarToggleState(); }catch(e){}
  }
  try{
    const dv = document.getElementById('doc-viewer');
    if(dv && dv.classList.contains('active') && currentDoc){
      const doc = (typeof window._resolveDocRecord === 'function')
        ? window._resolveDocRecord(currentDoc)
        : DOCS.find(d => String(d?.code || '') === String(currentDoc));
      const viewTxn = typeof getPortalDocViewTransaction === 'function'
        ? getPortalDocViewTransaction()
        : null;
      if(doc){
        if(viewTxn && !isPortalDocViewTransactionCurrent(viewTxn, doc)) return;
        if(typeof updateDocViewerHeader==='function') updateDocViewerHeader(doc);
        if(typeof renderWorkflowPanel==='function') renderWorkflowPanel(doc);
        if(typeof renderVersionHistory==='function') renderVersionHistory(doc);
        if(!editMode && typeof loadDocContent==='function'){
          let shouldReload = true;
          try{
            if(typeof getDocIframeLoadSignature === 'function' && typeof getDocLocaleView === 'function'){
              const nextSignature = getDocIframeLoadSignature(doc, getDocLocaleView(doc));
              shouldReload = !nextSignature || nextSignature !== String(window.__QMS_ACTIVE_DOC_CONTENT_SIGNATURE || '');
            }
          }catch(_e){ shouldReload = true; }
          if(shouldReload) loadDocContent(currentDoc);
        }
      }
    }
  }catch(e){}
  try{ schedulePortalShellLayoutAssert(viewerOpen ? 'docs-sync-viewer-open' : 'docs-sync'); }catch(e){}
}

function applyDocsTreeResponse(res, options={}){
  if(!(res && res.ok && Array.isArray(res.docs))) return null;
  const nextDocs = (Array.isArray(res.docs) ? res.docs : []).map(normalizeDocCatalogEntry);
  const nextTree = Array.isArray(res.tree) ? res.tree : [];
  const nextFingerprint = buildDocsSyncFingerprint(nextDocs, nextTree);
  let configChanged = false;
  try{
    if(res.display_config && typeof applyPortalDisplayConfig === 'function'){
      configChanged = !!applyPortalDisplayConfig(res.display_config);
    }
  }catch(e){}
  const changed = nextFingerprint !== lastDocsSyncFingerprint || configChanged;

  /* Synchronously overlay whatever DCC values we have cached so the
   * listing paints correctly on first render. The async fetch below will
   * then refresh the cache and re-paint if anything changed. */
  overlayDocsWithDccCache(nextDocs);

  DOCS = nextDocs;
  DOCS_LOADED = true;
  FOLDER_TREE = nextTree;
  buildDynamicFolderStructure();
  lastDocsSyncFingerprint = nextFingerprint;

  if(options.refreshUi && (changed || options.forceUiRefresh)){
    refreshPortalDocsUiAfterSync();
  }

  /* Kick off the DCC header fetch in the background. When it completes we
   * apply DB values (title/subtitle) over the filename-derived defaults
   * and trigger a UI refresh. This keeps the DB as the authoritative
   * source for display while the filesystem scan remains the source of
   * truth for which files physically exist. */
  refreshDccOverlayFromServer({refreshUi: !!options.refreshUi});

  console.log('[QMS] Loaded ' + DOCS.length + ' documents from server' + (res.cached ? ' (cached)' : '') + ', tree: ' + FOLDER_TREE.length + ' nodes');
  return {changed, count: DOCS.length, cached: !!res.cached};
}

/* ═══════════════════════════════════════════════════════════════════════════
 * DCC OVERLAY — DB as source of truth for document display metadata
 * ───────────────────────────────────────────────────────────────────────────
 * The portal scans the filesystem (api.php?action=scan_folders) to discover
 * which documents physically exist. Titles and descriptions, however, live
 * in the dcc_document_header table and must be displayed exactly as stored
 * so that an edit through the "Chỉnh Sửa Tài Liệu" dialog propagates from
 * DB → listing card / breadcrumb / doc-viewer header on the next render.
 *
 * We fetch /api/v1/dcc/documents, cache the result, and overlay whenever
 * DOCS is repopulated. Writes happen via the DCC upsert endpoint inside
 * doSaveDocEdit() — this overlay is the READ side. No hardcoding anywhere;
 * every value comes from either the filesystem (for the code slug) or the
 * DB (for human-editable fields).
 * ═══════════════════════════════════════════════════════════════════════ */
let __DCC_HEADER_CACHE = {};          // map: canonical doc_code/path → DCC header projection
let __DCC_HEADER_CACHE_BY_LOCALE = {vi: {}, en: {}}; // prevents VI/EN projection bleed
let __DCC_OVERLAY_IN_FLIGHT = false;  // dedupe concurrent fetches
let __DCC_OVERLAY_LOADED = false;     // true after first successful fetch
let __DCC_OVERLAY_PENDING_OPTIONS = null;
let __DCC_OVERLAY_FETCH_PROMISE = null;

function upsertDccOverlayCacheEntry(target, row){
  if (!target || !row || !row.doc_code) return false;
  const key = String(row.doc_code).toUpperCase();
  const entry = {
    doc_code:            row.doc_code || key,
    title:              row.title || '',
    subtitle:           row.subtitle || '',
    revision:           row.revision || '',
    status:             row.status || '',
    owner_role_code:    row.owner_role_code || '',
    approver_role_code: row.approver_role_code || '',
    effective_date:     row.effective_date || '',
    filename:           row.filename || '',
    filesystem_path:    row.filesystem_path || '',
    locale_variant_exists: !!row.locale_variant_exists,
    is_locale_fallback: !!row.is_locale_fallback,
    locale_artifact_present: !!row.locale_artifact_present,
    artifact_rel_path:  row.artifact_rel_path || '',
    translation_state:  row.translation_state || ''
  };
  target[key] = entry;
  const rowPath = String(entry.filesystem_path || '').trim().toLowerCase();
  const rowFilename = String(entry.filename || '').trim().toLowerCase();
  if (rowPath) target['path:' + rowPath] = entry;
  if (rowFilename) target['file:' + rowFilename] = entry;
  return true;
}

function overlayDocsWithDccCache(docs){
  if (!Array.isArray(docs)) return;
  const activeLocale = lang === 'en' ? 'en' : 'vi';
  const map = (__DCC_HEADER_CACHE_BY_LOCALE && __DCC_HEADER_CACHE_BY_LOCALE[activeLocale]) || {};
  __DCC_HEADER_CACHE = map;
  /* SCOPE: the filesystem (filename) is the authoritative source for
   * everything except the two fields the user edits explicitly in the
   * "Chỉnh Sửa Tài Liệu" dialog — doc_code (ID) and Vietnamese description
   * (subtitle). For those two, the DB is the single source of truth; the
   * portal listing, breadcrumb, and doc-viewer header all read them via
   * __displayCode / __displayDesc which take priority over filename defaults. */
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    if (!d) continue;
    d.__dccLocale = lang === 'en' ? 'en' : 'vi';
    d.__dccDocCode = '';
    d.__dccArtifactPath = '';
    d.__dccTranslationState = '';
    d.__dccLocaleFallback = false;
    d.__dccLocaleVariantExists = false;
    d.__dccLocaleUnavailable = false;
    d.__dccLocaleArtifactPresent = false;
    d.__dccLinked = false;
    delete d.__displayCode;
    delete d.__displayTitle;
    delete d.__displayDesc;
    delete d.__displayDescLocale;
    const code = String(d.code || '').toUpperCase();
    const path = String(d.path || '').trim().toLowerCase();
    const filename = path ? path.split('/').pop() : '';
    const row = (code && map[code])
      || (path && map['path:' + path])
      || (filename && map['file:' + filename]);
    if (!row) continue;
    // Keep title driven by the filesystem (filename-derived). Do NOT set
    // standard_title here — the user wants the filename to remain master
    // for the on-screen title.
    // DB subtitle wins over doc_descriptions.json and folder desc. Set
    // __displayDesc which is the top-priority slot in getDocDisplayDescription().
    /* The DB `subtitle` column stores the canonical Vietnamese description.
     * When the user selects English UI mode, the API flags rows without an
     * English locale-variant as `is_locale_fallback=true`. We still want to
     * SHOW the Vietnamese description in that case (better than blank);
     * the `__dccLocaleUnavailable` flag is preserved so any locale-aware
     * consumer that prefers a hard gate can still read it. The listing
     * card and breadcrumb render via `__displayDesc`, which is always
     * populated from the source subtitle so users see meaningful text in
     * both EN and VI modes until proper EN translations are authored. */
    const translationMissing = (lang === 'en') && !!row.is_locale_fallback && !row.locale_variant_exists;
    d.__dccDocCode = row.doc_code || code;
    d.__dccLocaleVariantExists = !!row.locale_variant_exists;
    d.__dccLocaleFallback = !!row.is_locale_fallback;
    d.__dccLocaleUnavailable = translationMissing;
    d.__dccLocaleArtifactPresent = !!row.locale_artifact_present;
    if (row.doc_code) d.__displayCode = row.doc_code;
    if (row.subtitle) {
      d.__displayDesc = row.subtitle;
      d.__displayDescLocale = activeLocale;
    }
    // Surface DCC metadata for any consumer that wants it (does not change
    // title display). The ribbon renderer reads directly from the API.
    if (row.revision)           d.__dccRevision       = row.revision;
    if (row.status)              d.__dccStatus         = row.status;
    if (row.owner_role_code)     d.__dccOwner          = row.owner_role_code;
    if (row.approver_role_code)  d.__dccApprover       = row.approver_role_code;
    if (row.effective_date)      d.__dccEffectiveDate  = row.effective_date;
    if (row.artifact_rel_path)   d.__dccArtifactPath   = row.artifact_rel_path;
    if (row.translation_state)   d.__dccTranslationState = row.translation_state;
    d.__dccLinked = true;
  }
}

async function refreshDccOverlayFromServer(options={}){
  const requestOptions = (options && typeof options === 'object') ? options : {};
  if (__DCC_OVERLAY_IN_FLIGHT) {
    const pendingRefreshUi = !__DCC_OVERLAY_PENDING_OPTIONS || __DCC_OVERLAY_PENDING_OPTIONS.refreshUi !== false;
    const requestRefreshUi = requestOptions.refreshUi !== false;
    __DCC_OVERLAY_PENDING_OPTIONS = { refreshUi: pendingRefreshUi || requestRefreshUi };
    return __DCC_OVERLAY_FETCH_PROMISE || Promise.resolve();
  }
  __DCC_OVERLAY_IN_FLIGHT = true;
  __DCC_OVERLAY_FETCH_PROMISE = (async function(){
    let currentOptions = requestOptions;
    do {
      __DCC_OVERLAY_PENDING_OPTIONS = null;
      try {
        const locale = lang === 'en' ? 'en' : 'vi';
        const pageSize = 250;
        const rows = [];
        for (let offset = 0; ; offset += pageSize) {
          const url = '/api/v1/dcc/documents?limit=' + pageSize + '&offset=' + offset + '&locale=' + encodeURIComponent(locale);
          const res = await fetch(url, {credentials: 'same-origin', headers: {'Accept': 'application/json'}, cache: 'no-store'});
          if (!res.ok) {
            // 401/403 just means the user isn't logged in yet — don't spam the console.
            if (res.status !== 401 && res.status !== 403) {
              console.warn('[DCC] overlay fetch HTTP ' + res.status);
            }
            return;
          }
          const body = await res.json().catch(() => null);
          // The controller's success wrapper may nest items under `data.items`, or
          // return `{items: [...]}` directly. Try every plausible shape.
          const pageRows = (body && body.data && Array.isArray(body.data.items)) ? body.data.items
                         : (body && Array.isArray(body.items))                   ? body.items
                         : (body && Array.isArray(body.headers))                 ? body.headers
                         : (body && body.data && Array.isArray(body.data))       ? body.data
                         : (Array.isArray(body) ? body : []);
          rows.push.apply(rows, pageRows);
          if (pageRows.length < pageSize) break;
        }
        const next = {};
        for (let i = 0; i < rows.length; i++) {
          upsertDccOverlayCacheEntry(next, rows[i]);
        }
        const previousForLocale = (__DCC_HEADER_CACHE_BY_LOCALE && __DCC_HEADER_CACHE_BY_LOCALE[locale]) || {};
        const changed = JSON.stringify(next) !== JSON.stringify(previousForLocale);
        __DCC_HEADER_CACHE_BY_LOCALE[locale] = next;
        if ((lang === 'en' ? 'en' : 'vi') === locale) {
          __DCC_HEADER_CACHE = next;
        }
        __DCC_OVERLAY_LOADED = true;
        if ((lang === 'en' ? 'en' : 'vi') === locale && Array.isArray(DOCS) && DOCS.length) {
          overlayDocsWithDccCache(DOCS);
          if (currentOptions.refreshUi !== false && changed) {
            try { refreshPortalDocsUiAfterSync(); } catch(e){}
          }
        }
        try { console.log('[DCC] overlay loaded ' + Object.keys(next).length + ' rows' + (changed ? ' (changed)' : '')); } catch(e){}
      } catch (e) {
        console.warn('[DCC] overlay fetch failed (non-fatal)', e);
      }
      if (!__DCC_OVERLAY_PENDING_OPTIONS) break;
      currentOptions = __DCC_OVERLAY_PENDING_OPTIONS;
    } while (true);
  })();
  try {
    return await __DCC_OVERLAY_FETCH_PROMISE;
  } finally {
    __DCC_OVERLAY_IN_FLIGHT = false;
    __DCC_OVERLAY_FETCH_PROMISE = null;
    __DCC_OVERLAY_PENDING_OPTIONS = null;
  }
}

async function refreshDccOverlayForDocFromServer(code, options={}){
  const requestOptions = (options && typeof options === 'object') ? options : {};
  const docCode = String(code || '').trim();
  if (!docCode) return null;
  try {
    const locale = lang === 'en' ? 'en' : 'vi';
    const url = '/api/v1/dcc/documents/' + encodeURIComponent(docCode) + '/header?locale=' + encodeURIComponent(locale);
    const res = await fetch(url, {credentials: 'same-origin', headers: {'Accept': 'application/json'}, cache: 'no-store'});
    if (!res.ok) {
      if (res.status !== 401 && res.status !== 403 && res.status !== 404) {
        console.warn('[DCC] header fetch HTTP ' + res.status);
      }
      return null;
    }
    const body = await res.json().catch(() => null);
    const row = (body && body.data && body.data.header) ? body.data.header
              : (body && body.header) ? body.header
              : (body && body.data && body.data.doc_code) ? body.data
              : (body && body.doc_code) ? body
              : null;
    if (!row || !row.doc_code) return null;
    const next = Object.assign({}, (__DCC_HEADER_CACHE_BY_LOCALE && __DCC_HEADER_CACHE_BY_LOCALE[locale]) || {});
    const changed = upsertDccOverlayCacheEntry(next, row)
      && JSON.stringify(next) !== JSON.stringify((__DCC_HEADER_CACHE_BY_LOCALE && __DCC_HEADER_CACHE_BY_LOCALE[locale]) || {});
    __DCC_HEADER_CACHE_BY_LOCALE[locale] = next;
    if ((lang === 'en' ? 'en' : 'vi') === locale) {
      __DCC_HEADER_CACHE = next;
    }
    __DCC_OVERLAY_LOADED = true;
    if ((lang === 'en' ? 'en' : 'vi') === locale && Array.isArray(DOCS) && DOCS.length) {
      overlayDocsWithDccCache(DOCS);
      if (requestOptions.refreshUi !== false && changed) {
        try { refreshPortalDocsUiAfterSync(); } catch(e){}
      }
    }
    return row;
  } catch(e) {
    console.warn('[DCC] header fetch failed (non-fatal)', e);
  }
  return null;
}

// Exposed so doSaveDocEdit() can force an immediate refresh after a save.
window.refreshDccOverlayFromServer = refreshDccOverlayFromServer;
window.refreshDccOverlayForDocFromServer = refreshDccOverlayForDocFromServer;

function shouldPauseLiveDocsSync(){
  try{
    const app = document.getElementById('app');
    if(app && !app.classList.contains('active')) return true;
  }catch(e){}
  try{ if(document.hidden) return true; }catch(e){}
  try{ if(typeof editMode !== 'undefined' && editMode) return true; }catch(e){}
  try{ if(isPortalDocViewerOpen()) return true; }catch(e){}
  try{ if(typeof folderEditMode !== 'undefined' && folderEditMode) return true; }catch(e){}
  try{
    const blockingSelector = [
      '#sync-report-modal',
      '#recovery-modal',
      '#preview-modal',
      '.sync-report-overlay',
      '.vp-overlay',
      '.modal-overlay',
      '.confirm-overlay'
    ].join(',');
    if(document.querySelector(blockingSelector)) return true;
  }catch(e){}
  return false;
}

async function fetchDocsTree(forceFresh=true) {
  const url = forceFresh
    ? ('api.php?action=scan_folders&bust=' + Date.now())
    : 'api.php?action=scan_folders';
  const res = await fetch(url, {credentials:'include', cache:'no-store'});
  return await res.json();
}

async function loadDocsFromServer() {
  try {
    const res = await fetchDocsTree(true);
    return !!applyDocsTreeResponse(res);
  } catch (e) {
    console.warn('[QMS] scan_folders failed, using fallback', e);
  }
  return false;
}

async function runLiveDocsSync(reason='interval'){
  if(liveDocsSyncInFlight || shouldPauseLiveDocsSync()) return false;
  liveDocsSyncInFlight = true;
  try{
    const res = await fetchDocsTree(true);
    const applied = applyDocsTreeResponse(res, {refreshUi:true});
    if(applied && applied.changed){
      console.log('[QMS] Live document sync applied via ' + reason);
      return true;
    }
  }catch(e){
    console.warn('[QMS] live sync failed', e);
  }finally{
    liveDocsSyncInFlight = false;
  }
  return false;
}

function handleLiveDocsSyncVisibility(){
  if(document.hidden) return;
  void runLiveDocsSync('visibility');
}

function handleLiveDocsSyncFocus(){
  void runLiveDocsSync('focus');
}

function startLiveDocsSync(){
  stopLiveDocsSync();
  liveDocsSyncTimer = window.setInterval(() => {
    void runLiveDocsSync('interval');
  }, LIVE_DOCS_SYNC_INTERVAL_MS);
  document.addEventListener('visibilitychange', handleLiveDocsSyncVisibility);
  window.addEventListener('focus', handleLiveDocsSyncFocus);
  window.setTimeout(() => {
    void runLiveDocsSync('startup');
  }, 1500);
}

function stopLiveDocsSync(){
  if(liveDocsSyncTimer){
    clearInterval(liveDocsSyncTimer);
    liveDocsSyncTimer = null;
  }
  liveDocsSyncInFlight = false;
  document.removeEventListener('visibilitychange', handleLiveDocsSyncVisibility);
  window.removeEventListener('focus', handleLiveDocsSyncFocus);
}

// ═══ DYNAMIC FOLDER TREE ═══
let FOLDER_TREE = []; // Populated from scan_folders response
let FOLDER_DESCS = {}; // Folder descriptions from server
let DOC_DESCS = {}; // Document descriptions from server

async function loadFolderDescriptions(){
  try {
    const res = await apiCall('folder_descriptions', null, 'GET');
    if(res && res.ok && res.descriptions) FOLDER_DESCS = res.descriptions;
  } catch(e){ console.warn('[QMS] folder_descriptions failed', e); }
  // Also load doc descriptions via API (data is private)
  try {
    const res2 = await apiCall('doc_descriptions_get', null, 'GET');
    if(res2 && res2.ok && res2.descriptions) DOC_DESCS = res2.descriptions;
  } catch(e){ console.warn('[QMS] doc_descriptions failed', e); }
}

function getFolderDesc(folderPath){
  if(!folderPath) return '';
  // 1) Exact path match
  if(FOLDER_DESCS[folderPath]) return FOLDER_DESCS[folderPath];
  // 2) Try folder name only (last segment)
  const name = folderPath.split('/').pop();
  if(name && FOLDER_DESCS[name]) return FOLDER_DESCS[name];
  // 3) Partial match — try stripping the number prefix
  const coreName = name.replace(/^\d{2}-/, '');
  for(const k in FOLDER_DESCS){
    const kName = k.split('/').pop();
    if(kName && kName.replace(/^\d{2}-/, '') === coreName) return FOLDER_DESCS[k];
  }
  return '';
}

function getDocDesc(code){
  if(!code) return '';
  const upper = code.toUpperCase();
  if(DOC_DESCS[upper]) return DOC_DESCS[upper];
  const slug = upper.replace(/_/g, '-');
  if(DOC_DESCS[slug]) return DOC_DESCS[slug];
  /* Defensive: skip empty / too-short keys. A corrupt entry like
   * `DOC_DESCS[""] = "Sổ khóa audit..."` would otherwise match every doc
   * because `"ANY".startsWith("")` is always true, leaking that text into
   * unrelated cards. We require the key to have a recognisable code
   * shape (≥ 3 alphanumerics) before honouring the loose-prefix match. */
  for(const k in DOC_DESCS){
    if(!k || k.length < 3) continue;
    if(k.startsWith(upper) || upper.startsWith(k)) return DOC_DESCS[k];
  }
  try{
    const doc = Array.isArray(DOCS) ? DOCS.find(d=>String(d.code||'').toUpperCase()===upper) : null;
    if(doc && doc.description) return doc.description;
  }catch(e){}
  return '';
}

const DOC_TITLE_TOKEN_MAP = {
  ap: 'AP',
  apqp: 'APQP',
  ar: 'AR',
  as9100d: 'AS9100D',
  bom: 'BOM',
  capa: 'CAPA',
  cnc: 'CNC',
  coc: 'COC',
  coa: 'COA',
  cpk: 'Cpk',
  crm: 'CRM',
  csr: 'CSR',
  dep: 'DEP',
  dhr: 'DHR',
  dnc: 'DNC',
  ecr: 'ECR',
  eco: 'ECO',
  ehs: 'EHS',
  erp: 'ERP',
  fai: 'FAI',
  fod: 'FOD',
  frm: 'FRM',
  gmp: 'GMP',
  gs1: 'GS1',
  hse: 'HSE',
  hr: 'HR',
  ipqc: 'IPQC',
  iso: 'ISO',
  iso9001: 'ISO 9001',
  iqc: 'IQC',
  it: 'IT',
  jd: 'JD',
  kpi: 'KPI',
  lab: 'LAB',
  m365: 'M365',
  nc: 'NC',
  ncr: 'NCR',
  oee: 'OEE',
  ojt: 'OJT',
  org: 'ORG',
  pfmea: 'PFMEA',
  po: 'PO',
  ppc: 'PPC',
  qa: 'QA',
  qc: 'QC',
  qms: 'QMS',
  raci: 'RACI',
  ref: 'REF',
  rfq: 'RFQ',
  sla: 'SLA',
  sop: 'SOP',
  sops: 'SOPs',
  spc: 'SPC',
  sscc: 'SSCC',
  swot: 'SWOT',
  trn: 'TRN',
  wi: 'WI',
};
const DOC_TITLE_LOWER_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'via', 'with']);

function looksLikeVietnameseText(text){
  if(!text) return false;
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(String(text).normalize('NFC'));
}

function deriveDocTitleToken(token, index){
  if(!token) return '';
  const lower = token.toLowerCase();
  if(DOC_TITLE_TOKEN_MAP[lower]) return DOC_TITLE_TOKEN_MAP[lower];
  if(/^\d+$/.test(token)) return token;
  if(index > 0 && DOC_TITLE_LOWER_WORDS.has(lower)) return lower;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function deriveDocTitleFromPath(doc){
  const relPath = String(doc?.path || '').split(/[?#]/)[0];
  const base = (relPath.split('/').pop() || '').replace(/\.[^.]+$/, '');
  if(!base) return '';

  const code = String(doc?.code || '').trim().toLowerCase();
  let stem = base;
  if(code){
    const codeTokens = code.split(/[^a-z0-9]+/).filter(Boolean);
    if(codeTokens.length){
      const prefixPattern = '^' + codeTokens.join('[-_]+') + '(?:[-_]+)?';
      stem = stem.replace(new RegExp(prefixPattern, 'i'), '');
    }
  }
  if(!stem) return '';

  const tokens = stem.split(/[-_]+/).filter(Boolean);
  if(!tokens.length) return '';

  return tokens
    .map((token, index) => deriveDocTitleToken(token, index))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function deriveDocCodeFromPath(doc){
  const relPath = String(doc?.path || '').split(/[?#]/)[0];
  const base = (relPath.split('/').pop() || '').replace(/\.[^.]+$/, '');
  if(!base) return '';

  // Mirror the backend's scan_extract_code() — return the SHORT canonical form
  // and stop at the numeric tail so filenames such as
  //     qms-man-001-qms-manual.html    → QMS-MAN-001
  //     pol-qms-001-quality-policy.html → POL-QMS-001
  //     annex-hr-lab-007-safety.html   → ANNEX-HR-LAB-007
  // return the same code the backend's scan_cache.json is keyed on.
  const patterns = [
    /^(sop-\d{3})/i,
    /^(frm-\d{3})/i,
    /^(wi-\d{3})/i,
    /^(annex-\d{3})/i,
    /^(ref-\d{3})/i,
    /^(qms-man-\d+)/i,
    /^(qms-gdl-\d+)/i,
    /^(frm-hr-jd-[a-z]+-\d+)/i,
    /^(frm-hr-trn-\d+)/i,
    /^(annex-dep-[a-z]+-\d+)/i,
    /^(annex-(?:job|org)-\d+)/i,
    /^(annex-hr-lab-\d+)/i,
    /^((?:sop|proc|wi|frm|annex|pol|qms|dept)-[a-z]+-\d+)/i,
    /^(jd-[a-z0-9-]+)/i,
    /^(dept-[a-z0-9-]+)/i,
    /^(raci-[a-z0-9-]+)/i,
    /^(authority-[a-z0-9-]+)/i,
  ];
  for (let i = 0; i < patterns.length; i++) {
    const m = base.match(patterns[i]);
    if (m) return String(m[1] || '').toUpperCase();
  }
  // Last-resort fallback — sanitise the raw stem the same way scan_extract_code
  // does at its tail, so unknown prefixes still yield a usable code.
  return base.toUpperCase().replace(/[^A-Z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

function looksLikeFilenameSlugTitle(text){
  const value = String(text || '').trim();
  if(!value) return false;
  if(/^(?:WI|ANNEX)-\d{3}(?:[-_\s]+[A-Z0-9]+){2,}$/i.test(value)) return true;
  if(/^(?:WI|ANNEX)\s+\d{3}(?:[-_\s]+[A-Z0-9]+){2,}$/i.test(value)) return true;
  if(value.includes('_')) return true;
  return /^[A-Z0-9]+(?:[- ][A-Z0-9]+){4,}$/.test(value) && !looksLikeVietnameseText(value);
}

function normalizeDocCatalogEntry(doc){
  const next = Object.assign({}, doc || {});
  const originalCode = String(next.code || '').trim();
  const normalizedCode = deriveDocCodeFromPath(next);
  if(normalizedCode){
    if(originalCode && originalCode.toUpperCase() !== normalizedCode){
      next.__rawCode = originalCode;
    }
    next.code = normalizedCode;
  }

  const rawTitle = String(next.title || '').trim();
  const derivedTitle = deriveDocTitleFromPath(next);
  if(!rawTitle){
    if(derivedTitle) next.title = derivedTitle;
    return next;
  }

  const originalCodeForTitle = String((next.__rawCode || originalCode || next.code || '')).trim();
  const rawTitleUpper = rawTitle.toUpperCase();
  if(
    looksLikeFilenameSlugTitle(rawTitle) ||
    (originalCodeForTitle && rawTitleUpper === originalCodeForTitle.toUpperCase()) ||
    looksLikeVietnameseText(rawTitle)
  ){
    next.__rawTitle = rawTitle;
    if(derivedTitle) next.title = derivedTitle;
  }

  return next;
}

function getDocDisplayCode(doc){
  if(!doc) return '';
  const runtimeCode = String(doc.__displayCode || '').trim();
  if(runtimeCode) return runtimeCode;
  return String(doc.code || '').trim();
}

function getDocDisplayTitle(doc){
  if(!doc) return '';
  const code = getDocDisplayCode(doc);
  const explicitStandard = String(doc.standard_title || doc.standardTitle || '').trim();
  if(explicitStandard) return explicitStandard;
  const derivedTitle = deriveDocTitleFromPath(doc);
  if(derivedTitle) return derivedTitle;
  const runtimeTitle = String(doc.__displayTitle || '').trim();
  if(runtimeTitle && runtimeTitle.toUpperCase() !== code.toUpperCase() && !looksLikeVietnameseText(runtimeTitle) && !/[^\x20-\x7E]/.test(runtimeTitle)) return runtimeTitle;
  const rawTitle = String(doc.title || '').trim();
  if(rawTitle && rawTitle.toUpperCase() !== code.toUpperCase() && !looksLikeVietnameseText(rawTitle) && !/[^\x20-\x7E]/.test(rawTitle)) return rawTitle;
  return code;
}

function getDocStandardTitle(doc){
  if(!doc) return '';
  const explicitStandard = String(doc.standard_title || doc.standardTitle || '').trim();
  if(explicitStandard) return explicitStandard;

  const derivedTitle = deriveDocTitleFromPath(doc);
  if(derivedTitle) return derivedTitle;

  const runtimeTitle = String(doc.__displayTitle || '').trim();
  const code = getDocDisplayCode(doc);
  if(runtimeTitle && runtimeTitle.toUpperCase() !== code.toUpperCase() && !looksLikeVietnameseText(runtimeTitle) && !/[^\x20-\x7E]/.test(runtimeTitle)){
    return runtimeTitle;
  }

  const rawTitle = String(doc.title || '').trim();
  if(rawTitle && rawTitle.toUpperCase() !== code.toUpperCase() && !looksLikeVietnameseText(rawTitle) && !/[^\x20-\x7E]/.test(rawTitle)){
    return rawTitle;
  }

  return code;
}

function getDocDisplayDescription(doc){
  if(!doc) return '';
  /* Removed the `lang==='en' && __dccLocaleUnavailable → return ''` gate.
   * The Vietnamese subtitle is the canonical description; even in English
   * UI mode users want to see it (better than blank) until English locale
   * variants are authored. The `__dccLocaleUnavailable` flag is still set
   * by the overlay for any consumer that needs to detect "no EN translation
   * available" — it just no longer suppresses the listing card line. */
  const runtimeDescLocale = String(doc.__displayDescLocale || '').trim();
  const activeLocale = lang === 'en' ? 'en' : 'vi';
  const runtimeDesc = (!runtimeDescLocale || runtimeDescLocale === activeLocale)
    ? String(doc.__displayDesc || '').trim()
    : '';
  if(runtimeDesc) return runtimeDesc;
  const explicitDesc = String(getDocDesc(doc.code) || '').trim();
  if(explicitDesc) return explicitDesc;

  const rawTitle = String(doc.__rawTitle || doc.title || '').trim();
  const displayTitle = getDocDisplayTitle(doc);
  if(rawTitle && rawTitle !== displayTitle && looksLikeVietnameseText(rawTitle)) return rawTitle;

  const folderDesc = String(getFolderDesc(doc.folder || '') || '').trim();
  if(folderDesc) return folderDesc;
  return '';
}

async function saveFolderDesc(folderPath, desc){
  FOLDER_DESCS[folderPath] = desc;
  try { await apiCall('folder_descriptions', {path: folderPath, description: desc}); } catch(e){}
}

// Build FOLDER_STRUCTURE and SUBFOLDER_MAP from tree
function buildDynamicFolderStructure(){
  // Reset
  DYNAMIC_FOLDERS = {}; // catCode → {subName → folderPath}
  SUBFOLDER_LABELS = {}; // folderPath → {name, num}

  FOLDER_TREE.forEach(top => {
    const cat = top.cat || '?';
    if(!top.subs || top.subs.length === 0) return;
    if(!DYNAMIC_FOLDERS[cat]) DYNAMIC_FOLDERS[cat] = {};
    top.subs.forEach(sub => {
      DYNAMIC_FOLDERS[cat][sub.name] = sub.path;
      SUBFOLDER_LABELS[sub.path] = {name: sub.name, num: sub.num};
      // Deep subs (e.g., Organization/Job-Descriptions/JD-EXE)
      if(sub.subs && sub.subs.length > 0){
        const deepCat = cat + ':' + sub.name;
        if(!DYNAMIC_FOLDERS[deepCat]) DYNAMIC_FOLDERS[deepCat] = {};
        sub.subs.forEach(deep => {
          DYNAMIC_FOLDERS[deepCat][deep.name] = deep.path;
          SUBFOLDER_LABELS[deep.path] = {name: deep.name, num: deep.num};
        });
      }
    });
  });
}
let DYNAMIC_FOLDERS = {};
let SUBFOLDER_LABELS = {};

function getTreeNodesForCategory(catCode){
  if(!Array.isArray(FOLDER_TREE) || !catCode) return [];
  return FOLDER_TREE.filter(t => String(t?.cat || '') === String(catCode));
}

function getDocsUnderTreePath(treePath, docs){
  const base = String(treePath || '').replace(/\/+$/,'');
  if(!base) return [];
  const docList = Array.isArray(docs) ? docs : DOCS;
  return docList.filter(d => {
    const folder = String(d?.folder || '');
    const path = String(d?.path || '');
    return folder === base || folder.startsWith(base + '/') || path.startsWith(base + '/');
  });
}

function getTreeNodeScore(node, docs){
  if(!node) return Number.NEGATIVE_INFINITY;
  const path = String(node.path || '');
  const fileCount = Number(node.fileCount || 0);
  const subCount = Array.isArray(node.subs) ? node.subs.length : 0;
  const depth = path ? path.split('/').length : 0;
  const docCount = getDocsUnderTreePath(path, docs).length;
  return (docCount * 1000) + (fileCount * 10) + subCount - depth;
}

function getBestTreeNodeForCategory(catCode, docs){
  const nodes = getTreeNodesForCategory(catCode);
  if(nodes.length === 0) return null;
  return nodes.slice().sort((a,b) => getTreeNodeScore(b, docs) - getTreeNodeScore(a, docs))[0] || null;
}

function getCategoryTreeRoot(catCode, docs){
  const nodes = getTreeNodesForCategory(catCode);
  if(nodes.length === 0) return null;
  if(nodes.length === 1) return nodes[0];
  const orderedNodes = nodes.slice().sort((a,b) => {
    const numDiff = Number(a?.num || 0) - Number(b?.num || 0);
    if(numDiff !== 0) return numDiff;
    return String(a?.name || '').localeCompare(String(b?.name || ''));
  });
  const cat = (Array.isArray(CATEGORIES) ? CATEGORIES : []).find(item => String(item?.id || '') === String(catCode));
  const label = cat ? (typeof catLabel === 'function' ? catLabel(cat).split('(')[0].trim() : String(cat.label || catCode)) : String(catCode || '');
  const nodeParents = orderedNodes
    .map(node => String(node?.path || '').split('/').slice(0, -1).join('/'))
    .filter(Boolean);
  const rootPath = nodeParents.length > 0 && nodeParents.every(path => path === nodeParents[0])
    ? nodeParents[0]
    : '';
  return {
    path: rootPath,
    num: 0,
    name: label || String(catCode || ''),
    cat: String(catCode || ''),
    fileCount: orderedNodes.reduce((sum, node) => sum + Number(node?.fileCount || 0), 0),
    subs: orderedNodes
  };
}

function resolveTreeNodeForCategory(catCode, folderSegments, docs){
  let currentNode = getCategoryTreeRoot(catCode, docs) || getBestTreeNodeForCategory(catCode, docs);
  if(!currentNode) return null;
  const segs = Array.isArray(folderSegments) ? folderSegments : [];
  for(let i=0; i<segs.length && currentNode; i++){
    const seg = segs[i];
    const child = (currentNode.subs || []).find(s => (s.path || '').split('/').pop() === seg);
    if(child) currentNode = child;
  }
  return currentNode;
}

// Helper: get subfolder name from doc path
// e.g., "05-Processes/01-PROC-CNC/proc-cnc-001.html" → "01-PROC-CNC"
function getDocSubfolder(doc){
  const p = doc.path || '';
  const parts = p.split('/');
  if(parts.length >= 3) return parts[parts.length-2]; // subfolder is second-to-last
  return null;
}

// Helper: get subfolder label for display
function getSubfolderLabel(subName){
  // Strip number prefix: "01-PROC-CNC" → "PROC-CNC"
  const m = subName.match(/^\d{2}-(.+)$/);
  return m ? m[1] : subName;
}

// Helper: group docs by their subfolder within a category (flat grouping)
function groupDocsBySubfolder(docs){
  const groups = {};
  docs.forEach(d => {
    const sub = getDocSubfolder(d) || '_root';
    if(!groups[sub]) groups[sub] = [];
    groups[sub].push(d);
  });
  // Sort by subfolder name (numbered → natural order)
  const ordered = Object.keys(groups).sort();
  return ordered.map(k => ({sub: k, label: getSubfolderLabel(k), docs: groups[k]}));
}

// ═══ DYNAMIC FOLDER TREE BUILDER ═══
// Builds nested tree matching actual filesystem for any category
// Uses FOLDER_TREE from API's scan_folders response
function buildDocFolderTree(docs, catCode){
  // Find tree node for this category
  const treeNode = getCategoryTreeRoot(catCode, docs) || getBestTreeNodeForCategory(catCode, docs);
  if(!treeNode || !treeNode.subs || treeNode.subs.length === 0){
    return {name: catCode, path: '', docs: docs, children: [], isLeaf: true};
  }

  const root = {name: treeNode.name, path: treeNode.path, docs: [], children: []};

  // Helper: recursively build tree
  function buildNode(apiNode, allDocs){
    const node = {
      name: apiNode.name || '',
      path: apiNode.path || '',
      num: apiNode.num || 0,
      docs: [],
      children: []
    };
    // Find docs whose folder matches this node's path
    node.docs = allDocs.filter(d => (d.folder||'') === apiNode.path);

    // Process sub-nodes
    if(apiNode.subs && apiNode.subs.length > 0){
      apiNode.subs.forEach(sub => {
        const child = buildNode(sub, allDocs);
        node.children.push(child);
      });
    }
    return node;
  }

  // Build children from API tree subs
  treeNode.subs.forEach(sub => {
    const child = buildNode(sub, docs);
    root.children.push(child);
  });

  // Docs directly in the category root (no subfolder)
  root.docs = docs.filter(d => (d.folder||'') === treeNode.path);

  return root;
}

// ═══ RECURSIVE TREE RENDERER — used by both Perms and Effective Docs tabs ═══
// mode: 'perms' | 'effective'
function renderFolderTreeHtml(node, mode, options, depth){
  depth = depth || 0;
  const indent = depth * 12;
  let html = '';

  // Render this node's children first (folders), then direct docs
  if(node.children && node.children.length > 0){
    node.children.forEach(child => {
      const allChildDocs = collectTreeDocs(child);
      const hasChildDocs = allChildDocs.length > 0;

      if(mode === 'perms'){
        const role = options.role;
        const isFullAccess = options.isFullAccess;
        const dAccess = allChildDocs.filter(d=>docMatchesRole(d.code,role)).length;
        const dAllChecked = hasChildDocs && dAccess === allChildDocs.length;
        const subPath = child.path.split('/').pop() || child.name;
        const folderControl = isFullAccess
          ? '<span style="color:var(--green-dark,#16a34a);font-weight:700;width:16px;display:inline-block">✓</span>'
          : (hasChildDocs
              ? '<input type="checkbox" '+(dAllChecked?'checked':'')+' onchange="toggleSubfolderPerms(this,\''+escapeHtml(options.catId)+'\',\''+escapeHtml(subPath)+'\',\''+role+'\')" style="margin:0">'
              : '<span style="color:var(--text-secondary,#94a3b8);font-weight:700;width:16px;display:inline-block">•</span>');
        const folderMeta = hasChildDocs
          ? `${dAccess}/${allChildDocs.length}`
          : (lang==='en' ? 'Empty folder' : 'Thư mục trống');

        html += `<div style="margin:4px 0 2px ${indent}px;padding:4px 8px;background:${depth>0?'var(--bg-1,#fff)':'var(--bg-2,#f8fafc)'};border-radius:8px;border:1px solid var(--border-light,#e2e8f0)">
          <div style="display:flex;align-items:center;gap:6px;padding:2px 0;font-size:${depth>0?'11':'12'}px;font-weight:600;color:var(--text-secondary,#475569)">
            ${folderControl}
            📁 ${escapeHtml(getSubfolderLabel(child.path.split('/').pop()||child.name))}
            <span style="font-weight:400;font-size:10px;color:var(--text-3);margin-left:auto">${folderMeta}</span>
          </div>`;

        // If child has sub-children, recurse
        if(child.children && child.children.length > 0){
          html += renderFolderTreeHtml(child, mode, options, depth+1);
        }
        // Render direct docs in this child folder
        child.docs.forEach(d => {
          const has = docMatchesRole(d.code, role);
          html += `<div class="perm-doc-row" style="padding-left:${20 + depth*8}px">
            <label>
              ${isFullAccess
                ? '<span style="color:var(--green-dark,#16a34a);font-weight:700;width:16px;display:inline-block">✓</span>'
                : '<input type="checkbox" data-doc="'+d.code+'" '+(has?'checked':'')+' onchange="toggleRoleDoc(this,\''+role+'\')">'}
              <span class="doc-code">${d.code}</span>
              ${d.title.substring(0,50)}${d.title.length>50?'...':''}
            </label>
          </div>`;
        });
        html += `</div>`;

      } else if(mode === 'effective'){
        const dHiddenCount = allChildDocs.filter(d=>isDocHidden(d.code)).length;
        const dAllHidden = hasChildDocs && dHiddenCount === allChildDocs.length;
        const dBtnLabel = dAllHidden ? (lang==='en'?'Show':'Hiện') : (lang==='en'?'Hide':'Ẩn');
        const dBtnIcon = dAllHidden ? '👁️' : '🙈';
        const subPath = child.path.split('/').pop() || child.name;
        const catId = options.catId;
        const subMeta = hasChildDocs
          ? `${allChildDocs.length} ${lang==='en'?'docs':'tài liệu'} • ${lang==='en'?'Hidden':'Ẩn'}: ${dHiddenCount}`
          : (lang==='en' ? 'Empty folder — ready for new controlled files' : 'Thư mục trống — sẵn sàng nhận tài liệu được kiểm soát');
        const subAction = hasChildDocs
          ? `<button class="btn-admin" style="font-size:11px;padding:4px 10px" onclick="toggleSubfolderHidden('${escapeHtml(catId)}','${escapeHtml(subPath)}')">${dBtnIcon} ${dBtnLabel}</button>`
          : `<span style="font-size:11px;color:var(--text-3);font-weight:600">${lang==='en'?'No files yet':'Chưa có file'}</span>`;
        const emptyNotice = (!hasChildDocs && (!child.children || child.children.length === 0))
          ? `<div style="padding:8px 2px 2px;font-size:11px;color:var(--text-3)">${lang==='en'?'This folder exists on disk but has no displayable files yet.':'Folder này đã tồn tại trên ổ đĩa nhưng hiện chưa có file hiển thị trên portal.'}</div>`
          : '';

        html += `<details class="admin-dept-group" ${(!hasChildDocs || !dAllHidden)?'open':''} style="border:1px solid var(--border-light,#e2e8f0);border-radius:10px;margin:${depth>0?'4':'8'}px 0 ${depth>0?'4':'8'}px ${indent}px;overflow:hidden;background:${depth>0?'var(--bg-1,#fff)':'var(--bg-2,#f8fafc)'}">
          <summary style="list-style:none;cursor:pointer;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px">
            <div style="display:flex;align-items:center;gap:10px;min-width:0">
              <div style="min-width:0">
                <div style="font-weight:700;font-size:${depth>0?'12':'13'}px">📁 ${escapeHtml(getSubfolderLabel(subPath))}</div>
                <div style="font-size:11px;color:var(--muted)">${subMeta}</div>
              </div>
            </div>
            <div style="display:flex;gap:6px;align-items:center" onclick="event.stopPropagation();">
              ${subAction}
            </div>
          </summary>
          <div style="padding:6px 10px">`;

        // If child has sub-children, recurse
        if(child.children && child.children.length > 0){
          html += renderFolderTreeHtml(child, mode, options, depth+1);
        }
        // Render direct docs in this child folder as table
        if(child.docs.length > 0){
          html += `<table class="admin-table" style="font-size:12px">
            <tr><th style="width:140px">${lang==='en'?'Code':'Mã'}</th><th>${lang==='en'?'Title':'Tên'}</th><th style="width:100px">${lang==='en'?'Status':'Trạng thái'}</th><th style="width:90px">${lang==='en'?'Action':'Hành động'}</th></tr>
            ${child.docs.map(d=>{
              const hidden=isDocHidden(d.code);
              return `<tr>
                <td><b>${escapeHtml(d.code)}</b></td>
                <td>${escapeHtml(d.title)}</td>
                <td>${hidden?`<span class="badge badge-gray">${lang==='en'?'Hidden':'Ẩn'}</span>`:`<span class="badge badge-green">${lang==='en'?'Visible':'Hiện'}</span>`}</td>
                <td><button class="btn-admin" style="font-size:11px;padding:3px 8px" onclick="toggleDocHidden('${escapeHtml(d.code)}')">${hidden?(lang==='en'?'Show':'Hiện'):(lang==='en'?'Hide':'Ẩn')}</button></td>
              </tr>`;
            }).join('')}
          </table>`;
        }
        html += emptyNotice;
        html += `</div></details>`;
      }
    });
  }

  // Root-level docs (files directly in the category root, no subfolder)
  if(node.docs && node.docs.length > 0 && depth > 0){
    if(mode === 'perms'){
      node.docs.forEach(d => {
        const has = docMatchesRole(d.code, options.role);
        html += `<div class="perm-doc-row" style="padding-left:${indent}px">
          <label>
            ${options.isFullAccess
              ? '<span style="color:var(--green-dark,#16a34a);font-weight:700;width:16px;display:inline-block">✓</span>'
              : '<input type="checkbox" data-doc="'+d.code+'" '+(has?'checked':'')+' onchange="toggleRoleDoc(this,\''+options.role+'\')">'}
            <span class="doc-code">${d.code}</span>
            ${d.title.substring(0,50)}${d.title.length>50?'...':''}
          </label>
        </div>`;
      });
    }
  }
  return html;
}

// Collect all docs in a tree node and its descendants
function collectTreeDocs(node){
  let docs = [...(node.docs||[])];
  if(node.children){
    node.children.forEach(c => { docs = docs.concat(collectTreeDocs(c)); });
  }
  return docs;
}

// Enhanced toggleSubfolderHidden — handles multi-level by matching all docs under a subfolder path
async function _toggleSubHidden(catId, subPath){
  // Match docs whose path contains this subfolder
  const docsInSub = DOCS.filter(d => {
    if(String(d.cat||'') !== String(catId)) return false;
    const p = d.path || '';
    // Check if any path component matches subPath
    const parts = p.split('/');
    return parts.some(part => part === subPath);
  });
  if(!docsInSub.length) return;
  const allHidden = docsInSub.every(d=>isDocHidden(d.code));
  const makeHidden = !allHidden;
  docsInSub.forEach(d=>{ if(makeHidden) HIDDEN_DOCS.add(d.code); else HIDDEN_DOCS.delete(d.code); });
  await saveDocVisibilityToServer();
  renderAdminEffectiveDocs();
  if(currentPage==='documents'){ renderDocuments(); renderSidebar(); }
  const label = getSubfolderLabel(subPath);
  showToast(makeHidden?(lang==='en'?`🙈 ${label} hidden`:`🙈 Đã ẩn ${label}`):(lang==='en'?`👁️ ${label} visible`:`👁️ Đã hiện ${label}`));
}

// Enhanced toggleSubfolderPerms — handles multi-level folders
function _toggleSubPerms(cb, catId, subPath, role){
  if(ROLE_DOCS[role]==='ALL') return;
  const docsInSub = DOCS.filter(d => {
    if(String(d.cat||'') !== String(catId)) return false;
    const p = d.path || '';
    const parts = p.split('/');
    return parts.some(part => part === subPath);
  });
  docsInSub.forEach(d=>{
    const has = ROLE_DOCS[role].some(p=>docCodeMatchesPattern(d.code,p));
    if(cb.checked && !has){
      ROLE_DOCS[role].push(d.code);
    } else if(!cb.checked && has){
      const idx=ROLE_DOCS[role].indexOf(d.code);
      if(idx>-1) ROLE_DOCS[role].splice(idx,1);
      ROLE_DOCS[role]=ROLE_DOCS[role].filter(p=>!docCodeMatchesPattern(d.code,p));
    }
  });
  saveRoleDocsToStorage();
  markUnsaved();
  renderAdminPerms();
}

// Force rescan (invalidate cache) — callable from Admin or after doc_create
async function rescanDocs() {
  try {
    const data = await fetchDocsTree(true);
    const applied = applyDocsTreeResponse(data, {refreshUi:true, forceUiRefresh:true});
    if (applied) return data.count;
  } catch (e) { console.warn('[QMS] rescan failed', e); }
  return 0;
}

// ═══════════════════════════════════════════════════
// i18n — LANGUAGE SYSTEM
// ═══════════════════════════════════════════════════
let lang = 'vi';
function _decodeLatin1ToUtf8(s){
  try{
    var bytes = new Uint8Array(s.length);
    var cp1252 = {
      8364:0x80, 8218:0x82, 402:0x83, 8222:0x84, 8230:0x85, 8224:0x86, 8225:0x87,
      710:0x88, 8240:0x89, 352:0x8A, 8249:0x8B, 338:0x8C, 381:0x8E, 8216:0x91,
      8217:0x92, 8220:0x93, 8221:0x94, 8226:0x95, 8211:0x96, 8212:0x97, 732:0x98,
      8482:0x99, 353:0x9A, 8250:0x9B, 339:0x9C, 382:0x9E, 376:0x9F
    };
    for(var i=0;i<s.length;i++){
      var code = s.charCodeAt(i);
      if(code <= 0xFF) bytes[i] = code & 0xFF;
      else if(cp1252[code] != null) bytes[i] = cp1252[code];
      else bytes[i] = 0x3F;
    }
    return new TextDecoder('utf-8').decode(bytes);
  }catch(e){
    try{
      var esc='';
      for(var j=0;j<s.length;j++){
        esc += '%' + (s.charCodeAt(j)&0xFF).toString(16).padStart(2,'0');
      }
      return decodeURIComponent(esc);
    }catch(_e){
      return s;
    }
  }
}
function _mojiScore(s){
  if(!s) return 0;
  var str = String(s);
  var bad = 0;
  bad += (str.match(/[\u00c2-\u00c5][\u0080-\u00bf]/g)||[]).length;
  bad += (str.match(/[\u00e1\u00e2][\u0080-\u00bf]/g)||[]).length;
  bad += (str.match(/[\u00c3\u00c2\u00c4\u00c5\u00e1\u00e2]/g)||[]).length;
  bad += (str.match(/\uFFFD/g)||[]).length * 2;
  var good = (str.match(/[\u00c0-\u1ef9\u0110\u0111]/g)||[]).length;
  return (bad * 3) - good;
}
function fixMojibakeText(s){
  if(typeof s !== 'string' || s.length < 2) return s;
  var dec = _decodeLatin1ToUtf8(s);
  if(!dec || dec === s) return s;
  var srcScore = _mojiScore(s);
  var decScore = _mojiScore(dec);
  if(decScore + 1 < srcScore) return dec;
  var srcGood = (s.match(/[\u00c0-\u1ef9\u0110\u0111]/g)||[]).length;
  var decGood = (dec.match(/[\u00c0-\u1ef9\u0110\u0111]/g)||[]).length;
  if(decGood > srcGood && decScore <= srcScore) return dec;
  return s;
}
function fixMojibakeDom(root){
  var ctx = root || document.body;
  if(!ctx) return;
  try{
    var tw = document.createTreeWalker(ctx, NodeFilter.SHOW_TEXT, null);
    var n;
    while((n = tw.nextNode())){
      var v = n.nodeValue || '';
      if(!v) continue;
      var fixed = fixMojibakeText(v);
      if(fixed !== v) n.nodeValue = fixed;
    }
  }catch(e){}
  try{
    var attrs = ['title','placeholder','aria-label','value'];
    ctx.querySelectorAll('*').forEach(function(el){
      attrs.forEach(function(a){
        if(!el.hasAttribute(a)) return;
        var v = el.getAttribute(a);
        if(!v) return;
        var fixed = fixMojibakeText(v);
        if(fixed !== v) el.setAttribute(a, fixed);
      });
    });
  }catch(e){}
}
window.fixMojibakeText = fixMojibakeText;
window.fixMojibakeDom = fixMojibakeDom;
const I = {
  // Sidebar
  dashboard:{vi:'Dashboard',en:'Dashboard'},
  all_docs:{vi:'Tất cả tài liệu',en:'All Documents'},
  search:{vi:'Tìm kiếm',en:'Search'},
  dictionary:{vi:'Từ điển thuật ngữ',en:'Glossary'},
  doc_types:{vi:'LOẠI TÀI LIỆU',en:'DOCUMENT TYPES'},
  collapse:{vi:'Thu gọn',en:'Collapse'},
  expand:{vi:'Mở rộng',en:'Expand'},
  collapse_menu:{vi:'Thu gọn menu',en:'Collapse menu'},
  expand_menu:{vi:'Mở rộng menu',en:'Expand menu'},
  // Header / Breadcrumb
  bc_dashboard:{vi:'Dashboard',en:'Dashboard'},
  bc_documents:{vi:'Tài liệu',en:'Documents'},
  bc_search:{vi:'Tìm kiếm',en:'Search'},
  bc_dictionary:{vi:'Từ điển thuật ngữ',en:'Glossary'},
  bc_access:{vi:'Phân quyền',en:'Access Matrix'},
  // Login
  login_title:{vi:'Đăng nhập',en:'Log in'},
  login_sub:{vi:'Nhập tài khoản để truy cập hệ thống tài liệu',en:'Enter your credentials to access the QMS portal'},
  login_user:{vi:'Tài khoản',en:'Username'},
  login_pin:{vi:'Mã PIN',en:'PIN Code'},
  login_btn:{vi:'Đăng nhập',en:'Log in'},
  login_error:{vi:'Sai tài khoản hoặc mã PIN',en:'Invalid username or PIN'},
  login_demo:{vi:'CHỌN NHANH TÀI KHOẢN DEMO',en:'QUICK SELECT DEMO ACCOUNT'},
  login_hero:{vi:'Hệ thống<br>Quản lý Chất lượng<br><em>ISO 9001:2026 • Revision-ready</em>',en:'Quality<br>Management System<br><em>ISO 9001:2026 • Revision-ready</em>'},
  login_desc:{vi:'Nền tảng quản lý tài liệu QMS tập trung cho toàn công ty. Truy cập SOP, quy trình vận hành, biểu mẫu và hướng dẫn công việc theo phân quyền chức năng.',en:'Centralized QMS document management platform. Access SOPs, operating procedures, forms and work instructions based on role-based permissions.'},
  // Dashboard
  hello:{vi:'Xin chào',en:'Hello'},
  full_access:{vi:'Bạn có quyền truy cập toàn bộ',en:'You have full access to all'},
  docs_word:{vi:'tài liệu QMS',en:'QMS documents'},
  partial_access:{vi:'Bạn có quyền truy cập',en:'You have access to'},
  of:{vi:'/',en:' of '},
  scope:{vi:'Phạm vi',en:'Scope'},
  total_docs:{vi:'Tổng tài liệu',en:'Total Documents'},
  in_system:{vi:'trong hệ thống',en:'in system'},
  approved:{vi:'Đã phê duyệt',en:'Approved'},
  effective:{vi:'hiệu lực',en:'effective'},
  draft:{vi:'Dự thảo',en:'Draft'},
  pending_review:{vi:'chờ review',en:'pending review'},
  accessible:{vi:'Được phép truy cập',en:'Accessible'},
  by_role:{vi:'theo vai trò',en:'by role'},
  quick_access:{vi:'Truy cập nhanh theo loại tài liệu',en:'Quick Access by Document Type'},
  exec_shortcuts_title:{vi:'🚀 Chuẩn thực thi RFQ → Cash (G0–G7)',en:'🚀 RFQ → Cash Execution (G0–G7)'},
  exec_shortcuts_desc:{vi:'Điểm truy cập nhanh các tài liệu "bắt buộc để chạy" theo Gate và Job Dossier.',en:'Quick access to "must-have" documents per gate and Job Dossier.'},
  system_overview:{vi:'Tổng quan hệ thống',en:'System Overview'},
  // Documents
  all:{vi:'Tất cả',en:'All'},
  search_docs_ph:{vi:'Tìm theo mã hoặc tên tài liệu...',en:'Search by code or document name...'},
  doc_code:{vi:'Mã tài liệu',en:'Doc Code'},
  doc_name:{vi:'Tên tài liệu',en:'Document Name'},
  rev:{vi:'Rev',en:'Rev'},
  status:{vi:'Trạng thái',en:'Status'},
  owner:{vi:'Owner',en:'Owner'},
  access:{vi:'Quyền',en:'Access'},
  active:{vi:'Hiệu lực',en:'Active'},
  draft_status:{vi:'Dự thảo',en:'Draft'},
  showing:{vi:'Hiển thị',en:'Showing'},
  no_docs:{vi:'Không tìm thấy tài liệu',en:'No documents found'},
  login_as:{vi:'Đăng nhập',en:'Logged in as'},
  // Search
  search_title:{vi:'Tìm kiếm tài liệu QMS',en:'Search QMS Documents'},
  search_ph:{vi:'Nhập mã tài liệu hoặc từ khóa...',en:'Enter document code or keyword...'},
  keyword:{vi:'Từ khóa',en:'Keyword'},
  no_results:{vi:'Không tìm thấy tài liệu cho',en:'No documents found for'},
  // Dictionary
  dict_title:{vi:'Từ điển thuật ngữ QMS',en:'QMS Glossary'},
  dict_desc:{vi:'Tra cứu viết tắt, thuật ngữ và định nghĩa thống nhất trong HESEM OS',en:'Look up abbreviations, terms and unified definitions in HESEM OS'},
  dict_open:{vi:'Mở bản gốc',en:'View original'},
  dict_ph:{vi:'Tìm thuật ngữ, viết tắt, từ khóa...',en:'Search term, abbreviation, keyword...'},
  dict_loading:{vi:'Đang tải từ điển...',en:'Loading glossary...'},
  dict_total:{vi:'Tổng thuật ngữ',en:'Total Terms'},
  dict_cats:{vi:'Nhóm phân loại',en:'Categories'},
  dict_filtered:{vi:'Kết quả lọc',en:'Filtered'},
  dict_display:{vi:'Hiển thị',en:'Displayed'},
  dict_ctx:{vi:'Bối cảnh',en:'Context'},
  dict_more:{vi:'Hiển thị thêm',en:'Show more'},
  dict_remaining:{vi:'còn lại',en:'remaining'},
  dict_source:{vi:'Nguồn',en:'Source'},
  dict_lookup:{vi:'Tra cứu',en:'Look up'},
  dict_all:{vi:'Tất cả',en:'All'},
  // Viewer
  back:{vi:'← Quay lại',en:'← Back'},
  open_tab:{vi:'↗ Mở tab mới',en:'↗ Open in new tab'},
  approve_btn:{vi:'✓ Phê duyệt',en:'✓ Approve'},
  type:{vi:'Loại',en:'Type'},
  approver:{vi:'Phê duyệt',en:'Approver'},
  status_active:{vi:'✓ Hiệu lực',en:'✓ Active'},
  status_draft:{vi:'◐ Dự thảo Draft',en:'◐ Draft Draft'},
  loading_doc:{vi:'Đang tải tài liệu...',en:'Loading document...'},
  // Access
  access_title:{vi:'Ma trận phân quyền truy cập',en:'Access Control Matrix'},
  access_desc:{vi:'Hàng được highlight là vai trò hiện tại của bạn',en:'Highlighted row is your current role'},
  role:{vi:'Vai trò',en:'Role'},
  approve:{vi:'Phê duyệt',en:'Approve'},
  // User menu
  logout:{vi:'Đăng xuất',en:'Log out'},
  admin_panel:{vi:'Quản trị hệ thống',en:'Admin Panel'},
  admin_users:{vi:'Quản lý người dùng',en:'User Management'},
  admin_perms:{vi:'Phân quyền tài liệu',en:'Document Permissions'},
  admin_roles:{vi:'Vai trò & Quyền hạn',en:'Roles & Permissions'},
  admin_effective_docs:{vi:'Tài liệu hiệu lực',en:'Effective Documents'},
  admin_log:{vi:'Nhật ký truy cập',en:'Access Log'},
  admin_add_user:{vi:'Thêm người dùng',en:'Add User'},
  admin_edit:{vi:'Sửa',en:'Edit'},
  admin_delete:{vi:'Xóa',en:'Delete'},
  admin_save:{vi:'Lưu',en:'Save'},
  admin_cancel:{vi:'Hủy',en:'Cancel'},
  admin_stats:{vi:'Tổng quan phân quyền',en:'Permission Overview'},
  admin_total_users:{vi:'Người dùng',en:'Users'},
  admin_total_roles:{vi:'Vai trò',en:'Roles'},
  admin_total_docs:{vi:'Tài liệu',en:'Documents'},
  bc_admin:{vi:'Quản trị',en:'Admin'},
  wf_draft:{vi:'Bản nháp',en:'Draft'},
  wf_in_review:{vi:'Đang xem xét',en:'In Review'},
  wf_pending:{vi:'Chờ duyệt',en:'Pending Approval'},
  wf_approved:{vi:'Đã duyệt',en:'Approved'},
  wf_initial:{vi:'Phát hành lần đầu',en:'Initial Release'},
  wf_obsolete:{vi:'Lỗi thời',en:'Obsolete'},
  wf_edit:{vi:'✏️ Chỉnh sửa',en:'✏️ Edit'},
  wf_save_draft:{vi:'💾 Lưu nháp',en:'💾 Save Draft'},
  wf_submit_review:{vi:'📤 Gửi xem xét',en:'📤 Submit for Review'},
  wf_approve_doc:{vi:'✅ Duyệt',en:'✅ Approve'},
  wf_reject_doc:{vi:'↩ Trả lại',en:'↩ Reject'},
  wf_cancel_edit:{vi:'✕ Hủy',en:'✕ Cancel'},
  wf_ver_history:{vi:'📋 Lịch sử phiên bản',en:'📋 DCR record'},
  wf_current:{vi:'Hiện tại',en:'Current'},
  wf_restore:{vi:'Khôi phục',en:'Restore'},
  wf_by:{vi:'bởi',en:'by'},
  wf_approved_by:{vi:'Duyệt bởi',en:'Approved by'},
  wf_rejected_by:{vi:'Trả lại bởi',en:'Rejected by'},
  wf_submitted_by:{vi:'Gửi xem xét bởi',en:'Submitted by'},
  wf_edited_by:{vi:'Chỉnh sửa bởi',en:'Edited by'},
  wf_no_history:{vi:'Chưa có lịch sử',en:'No DCR record'},
  wf_confirm_submit:{vi:'Xác nhận gửi tài liệu để xem xét và duyệt?',en:'Confirm submitting document for review and approval?'},
  wf_confirm_approve:{vi:'Xác nhận duyệt tài liệu này? Phiên bản sẽ được nâng lên.',en:'Confirm approving this document? Version will be bumped.'},
  wf_confirm_reject:{vi:'Lý do trả lại:',en:'Rejection reason:'},
  wf_note_label:{vi:'Ghi chú thay đổi:',en:'Change note:'},
  access_matrix:{vi:'📋 Ma trận phân quyền',en:'📋 Access Matrix'},
  in_review_label:{vi:'Chờ duyệt',en:'In Review'},
  click_review:{vi:'Nhấn để duyệt',en:'Click to review'},
  pending_waiting:{vi:'Đang chờ',en:'Pending'},
  editing:{vi:'Đang soạn',en:'Editing'},
  docs_unit:{vi:'tài liệu',en:'docs'},
  pending_approval:{vi:'Chờ duyệt',en:'Pending Approval'},
  submitted_by:{vi:'Gửi bởi',en:'Submitted by'},
  my_drafts:{vi:'Bản nháp của tôi',en:'My Drafts'},
  standards:{vi:'Tiêu chuẩn',en:'Standards'},
  controlled_docs:{vi:'Tài liệu kiểm soát, hồ sơ, bằng chứng',en:'Controlled docs, records, evidence'},
  at_each_gate:{vi:'tại mỗi gate',en:'at each gate'},
  code_label:{vi:'Mã',en:'Code'},
  revision_label:{vi:'Phiên bản',en:'Revision'},
  delete_draft_btn:{vi:'🗑 Xóa nháp',en:'🗑 Delete Draft'},
  new_revision:{vi:'📝 Tạo bản chỉnh sửa mới',en:'📝 New Revision'},
  clear_history:{vi:'🧹 Dọn lịch sử',en:'🧹 Clear History'},

  // Submit modal
  sm_title:{vi:'📤 Gửi tài liệu để xem xét',en:'📤 Submit Document for Review'},
  sm_subtitle:{vi:'Chọn loại cập nhật và gửi cho cấp trên phê duyệt',en:'Choose update type and submit for approval'},
  sm_submitter_label:{vi:'Người gửi',en:'Submitted by'},
  sm_submit_date:{vi:'Ngày gửi',en:'Submit date'},
  sm_update_type:{vi:'Loại cập nhật',en:'Update Type'},
  sm_minor:{vi:'Minor Update',en:'Minor Update'},
  sm_major:{vi:'Major Update',en:'Major Update'},
  sm_minor_ver:{vi:'Tăng số sau dấu chấm',en:'Increment number after dot'},
  sm_major_ver:{vi:'Tăng số trước dấu chấm',en:'Increment number before dot'},
  sm_minor_desc:{vi:'Sửa lỗi nhỏ, chỉnh sửa ngữ pháp, cập nhật định dạng, bổ sung thông tin không ảnh hưởng quy trình.',en:'Bug fixes, grammar corrections, formatting updates, addendums that don\'t affect processes.'},
  sm_major_desc:{vi:'Thay đổi cấu trúc, chính sách mới, yêu cầu mới, tổ chức lại nội dung, thay đổi quy trình vận hành.',en:'Structural changes, new policies, new requirements, content reorganization, process changes.'},
  sm_minor_examples:{vi:'Ví dụ: Sửa lỗi chính tả, cập nhật số điện thoại, thêm ghi chú, chỉnh format bảng',en:'Examples: Fix typos, update phone numbers, add notes, fix table formatting'},
  sm_major_examples:{vi:'Ví dụ: Thêm bước quy trình mới, thay đổi chính sách, cập nhật tiêu chuẩn, đổi cấu trúc tài liệu',en:'Examples: Add new process steps, change policies, update standards, restructure document'},
  sm_note_label:{vi:'Ghi chú thay đổi (tùy chọn):',en:'Change note (optional):'},
  sm_note_placeholder:{vi:'Mô tả ngắn gọn nội dung thay đổi...',en:'Brief description of changes...'},
  sm_cancel:{vi:'Hủy',en:'Cancel'},
  sm_submit_btn:{vi:'📤 Gửi xem xét',en:'📤 Submit for Review'},
  sm_select_type:{vi:'Vui lòng chọn loại cập nhật',en:'Please select an update type'},
  sm_update_type_label:{vi:'Loại',en:'Type'},

  // Recently Updated
  ru_title:{vi:'🔄 Cập nhật gần đây',en:'🔄 Recently Updated'},
  ru_subtitle:{vi:'Tài liệu đã được cập nhật trong 30 ngày qua',en:'Documents updated in the last 30 days'},
  ru_no_updates:{vi:'Không có tài liệu nào được cập nhật trong 30 ngày qua',en:'No documents updated in the last 30 days'},
  ru_approved_on:{vi:'Duyệt ngày',en:'Approved on'},
  ru_by:{vi:'bởi',en:'by'},
  ru_submitted_by_short:{vi:'Gửi bởi',en:'Submitted by'},
  ru_days_ago:{vi:'ngày trước',en:'days ago'},
  ru_today:{vi:'Hôm nay',en:'Today'},
  title_label:{vi:'Tên',en:'Title'},
  category_label:{vi:'Danh mục',en:'Category'},

  // Categories
  cat_POL:{vi:'Chính sách (Policy)',en:'Policy'},
  cat_MAN:{vi:'Sổ tay QMS (Manual)',en:'QMS Manual'},
  cat_SOP:{vi:'Quy trình (SOP)',en:'SOP'},
  cat_PROC:{vi:'Quy trình vận hành (PROC)',en:'Procedures (PROC)'},
  cat_WI:{vi:'Hướng dẫn (WI/OPS)',en:'Work Instructions (WI)'},
  cat_FRM:{vi:'Biểu mẫu (Forms)',en:'Forms'},
  cat_ANNEX:{vi:'Phụ lục (ANNEX)',en:'Annexes (ANNEX)'},
  cat_DEP:{vi:'Phòng ban (Dept)',en:'Departments'},
  cat_ORG:{vi:'Tổ chức & RACI',en:'Organization & RACI'},
  cat_TRN:{vi:'Đào tạo (Training)',en:'Training'},
  cat_COMP:{vi:'Năng lực (Competency)',en:'Competency'},
  cat_TMATRIX:{vi:'Ma trận đào tạo',en:'Training Matrix'},
  cat_DICT:{vi:'Từ điển thuật ngữ',en:'Glossary'},
  cat_LABOR:{vi:'Lao động',en:'Labor'},
};
Object.keys(I).forEach(function(k){
  var row = I[k];
  if(!row || typeof row !== 'object') return;
  if(typeof row.vi === 'string') row.vi = fixMojibakeText(row.vi);
  if(typeof row.en === 'string') row.en = fixMojibakeText(row.en);
});
function T(key){
  var out = I[key] ? (I[key][lang] || I[key].vi) : key;
  return (typeof out === 'string') ? fixMojibakeText(out) : out;
}
function catLabel(cat){
  const k = 'cat_'+cat.id;
  const out = I[k] ? I[k][lang] : cat.label;
  return (typeof out === 'string') ? fixMojibakeText(out) : out;
}

function postDocLanguageMessage(frame, payload){
  try{
    if(!frame || !frame.contentWindow) return false;
    const src = frame.getAttribute && frame.getAttribute('src');
    const origin = new URL(src || window.location.href, window.location.href).origin;
    frame.contentWindow.postMessage(payload, origin);
    return true;
  }catch(_e){
    return false;
  }
}

function renderEnglishLocaleSwitchPendingCard(){
  const iframe=document.getElementById('doc-iframe');
  const loading=document.getElementById('iframe-loading');
  if(loading) loading.style.display='none';
  if(!iframe) return;
  iframe.onload=function(){
    if(loading) loading.style.display='none';
    iframe.style.opacity='1';
  };
  try{ iframe.removeAttribute('src'); }catch(e){}
  iframe.style.opacity='1';
  iframe.srcdoc = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body{margin:0;background:#f8fafc;font-family:Segoe UI,Arial,sans-serif;color:#0f172a}
        .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
        .card{max-width:760px;background:#fff;border:1px solid #dbe3ef;border-radius:20px;padding:28px;box-shadow:0 16px 40px rgba(15,23,42,.06)}
        .eyebrow{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-bottom:10px}
        h1{margin:0 0 12px;font-size:28px;line-height:1.2}
        p{margin:0;line-height:1.7;color:#475569}
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="card">
          <div class="eyebrow">Loading locale projection</div>
          <h1>Preparing English view</h1>
          <p>The portal is loading the backend-published English artifact or fail-closed language status.</p>
        </div>
      </div>
    </body>
    </html>`;
}

function setLang(l){
  l = l === 'en' ? 'en' : 'vi';
  lang = l;
  try{ localStorage.setItem('hesem_lang', l); }catch(e){}
  try{ window.dispatchEvent(new CustomEvent('hesem:lang-change', {detail:{lang:l}})); }catch(e){}
  try{ if(typeof window.__hesemPortalPersistViewState === 'function') window.__hesemPortalPersistViewState('set-lang'); }catch(e){}
  try{
    if(typeof apiCall==='function' && typeof currentUser!=='undefined' && currentUser && currentUser.username){
      apiCall('user_set_language',{lang:l},'POST').catch(()=>{});
    }
  }catch(e){}
  const viBtn = document.getElementById('btn-lang-vi');
  const enBtn = document.getElementById('btn-lang-en');
  if(viBtn){
    viBtn.className = l==='vi'?'active':'';
    viBtn.setAttribute('aria-pressed', l==='vi'?'true':'false');
    viBtn.setAttribute('title', 'Tiếng Việt');
    viBtn.setAttribute('aria-label', 'Tiếng Việt');
  }
  if(enBtn){
    enBtn.className = l==='en'?'active':'';
    enBtn.setAttribute('aria-pressed', l==='en'?'true':'false');
    enBtn.setAttribute('title', 'English');
    enBtn.setAttribute('aria-label', 'English');
  }
  try{ document.querySelectorAll('.vp-overlay').forEach(el=>el.remove()); }catch(e){}
  const ct = document.getElementById('collapse-text');
  if(ct) ct.textContent = T('collapse');
  try{ if(typeof syncSidebarToggleState === 'function') syncSidebarToggleState(); }catch(e){}
  const ab = document.getElementById('dd-access-btn');
  if(ab) ab.textContent = T('access_matrix');
  const lb = document.getElementById('dd-logout-btn');
  if(lb) lb.textContent = T('logout');
  const il = document.getElementById('iframe-loading');
  if(il) il.innerHTML='<div class="spinner"></div>'+T('loading_doc');
  try{ if(typeof fixMojibakeDom==='function') fixMojibakeDom(document.body); }catch(e){}
  if(currentUser){
    const role=ROLES[currentUser.role];
    const hdrTitle=document.getElementById('hdr-title');
    if(hdrTitle&&role) hdrTitle.textContent=l==='en'?(role.labelEn||role.label):role.label;
    const ddTitle=document.getElementById('dd-title');
    if(ddTitle&&role) ddTitle.textContent=l==='en'?(role.labelEn||role.label):role.label;
  }

  const dv=document.getElementById('doc-viewer');
  const viewerOpen = !!(dv&&dv.classList.contains('active')&&currentDoc);
  const viewerOpenDocCode = viewerOpen ? String(currentDoc || '').trim() : '';
  try{ schedulePortalShellLayoutAssert('set-lang-start'); }catch(e){}

  renderSidebar();
  const titles = {dashboard:T('bc_dashboard'),documents:T('bc_documents'),search:T('bc_search'),dictionary:T('bc_dictionary'),access:T('bc_access'),admin:T('bc_admin')};
  const bcEl2 = document.getElementById('header-breadcrumb');
  if(bcEl2 && currentPage !== 'documents') bcEl2.innerHTML = `<span>HESEM MOM</span><span style="margin:0 4px">›</span><span class="current">${titles[currentPage]||currentPage}</span>`;
  if(!viewerOpen){
    if(currentPage==='dashboard') renderDashboard();
    if(currentPage==='documents') renderDocuments();
    if(currentPage==='search') renderSearch();
    if(currentPage==='dictionary') renderDictionary();
    if(currentPage==='access') renderAccessMatrix();
    if(currentPage==='admin') renderAdmin();
  }
  try{ if(typeof fixMojibakeDom==='function') fixMojibakeDom(document.body); }catch(e){}

  if(!viewerOpen){
    try{
      Promise.resolve(refreshDccOverlayFromServer({refreshUi:false})).then(function(){
        try{ if(currentPage==='documents' && !isPortalDocViewerOpen()) renderDocuments(); }catch(_e){}
        try{ schedulePortalShellLayoutAssert('set-lang-list-refresh'); }catch(_e){}
      }).catch(function(){});
    }catch(e){}
    try{ schedulePortalShellLayoutAssert('set-lang-complete'); }catch(e){}
    return;
  }

  const switchToken = viewerOpenDocCode + ':' + l + ':' + Date.now() + ':' + Math.random().toString(36).slice(2);
  window.__QMS_LANG_SWITCH_TOKEN = switchToken;
  const doc=(typeof window._resolveDocRecord === 'function')
    ? window._resolveDocRecord(viewerOpenDocCode)
    : DOCS.find(d=>String(d && d.code || '').trim()===viewerOpenDocCode);
  const viewTxn = (typeof beginPortalDocViewTransaction === 'function')
    ? beginPortalDocViewTransaction('set-lang', doc || viewerOpenDocCode, l)
    : null;
  if(doc){
    try{ if(typeof renderDocViewerBreadcrumb === 'function') renderDocViewerBreadcrumb(doc); }catch(e){}
    try{ updateDocViewerHeader(doc); }catch(e){}
    try{ renderWorkflowPanel(doc); }catch(e){}
    try{ renderVersionHistory(doc); }catch(e){}
    try{
      // The language switch must be atomic from the user's perspective: once
      // the shell is in the target language, the old-locale iframe must stop
      // being visible immediately. Backend refresh may refine the selected
      // artifact later, but it must not be the first step that changes content.
      if(viewTxn && !isPortalDocViewTransactionCurrent(viewTxn, doc, l)) return;
      if(viewerOpenDocCode && !editMode) loadDocContent(doc);
    }catch(e){}
  }
  try{
    const localeRefresh = (typeof refreshDccOverlayForDocFromServer === 'function')
      ? refreshDccOverlayForDocFromServer(viewerOpenDocCode, {refreshUi:false})
      : refreshDccOverlayFromServer({refreshUi:false});
    Promise.resolve(localeRefresh).then(function(){
      try{
        if(window.__QMS_LANG_SWITCH_TOKEN !== switchToken) return;
        if(viewTxn && !isPortalDocViewTransactionCurrent(viewTxn, viewerOpenDocCode, l)) return;
        if(lang !== l || String(currentDoc || '').trim() !== viewerOpenDocCode) return;
        const latestDoc = (typeof window._resolveDocRecord === 'function')
          ? window._resolveDocRecord(viewerOpenDocCode)
          : DOCS.find(d=>String(d && d.code || '').trim()===viewerOpenDocCode);
        if(latestDoc){
          try{ if(typeof renderDocViewerBreadcrumb === 'function') renderDocViewerBreadcrumb(latestDoc); }catch(_e){}
          updateDocViewerHeader(latestDoc);
          renderWorkflowPanel(latestDoc);
          renderVersionHistory(latestDoc);
          loadDocContent(latestDoc);
        }
      }catch(_e){}
    }).catch(function(){
      try{
        if(window.__QMS_LANG_SWITCH_TOKEN !== switchToken) return;
        if(viewTxn && !isPortalDocViewTransactionCurrent(viewTxn, viewerOpenDocCode, l)) return;
        if(lang !== l || String(currentDoc || '').trim() !== viewerOpenDocCode) return;
        if(viewerOpenDocCode&&!editMode) loadDocContent(viewerOpenDocCode);
      }catch(_e){}
    });
  }catch(e){}
  try{ schedulePortalShellLayoutAssert('set-lang-complete'); }catch(e){}
}

function initLang(){
  try{ const s=localStorage.getItem('hesem_lang'); if(s)lang=s; }catch(e){}
  const viBtn = document.getElementById('btn-lang-vi');
  const enBtn = document.getElementById('btn-lang-en');
  if(viBtn){
    viBtn.className = lang==='vi'?'active':'';
    viBtn.setAttribute('aria-pressed', lang==='vi'?'true':'false');
  }
  if(enBtn){
    enBtn.className = lang==='en'?'active':'';
    enBtn.setAttribute('aria-pressed', lang==='en'?'true':'false');
  }
  try{ if(typeof syncSidebarToggleState === 'function') syncSidebarToggleState(); }catch(e){}
}

// ═══════════════════════════════════════════════════
