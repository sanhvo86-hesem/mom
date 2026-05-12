/**
 * Triển khai vận hành — Command Center (rebuild v2)
 *
 * Replaces the legacy single-user localStorage dashboard with a shared,
 * backend-persisted ISO 9001 deployment program runner. State lives in
 * mom/data/config/deploy/*.json via DeployProgramController.
 *
 * Tabs:  Tổng quan · Lộ trình · Họp & Gate · Phòng ban · Tài liệu · Issues
 * Sign-off (week gate, meeting close): CEO + QMS Manager only.
 */

// ── Static config (catalog, not state) ────────────────────────────────────
const DEPLOY_CONFIG = {
  championTarget: 22, // 11 dept × 2 (primary + backup)
  phases: [
    {id:'P0', label:'Phase 0', title:'Chuẩn bị và đồng bộ',  weeks:'W0–W1', color:'#64748b'},
    {id:'P1', label:'Phase 1', title:'Đào tạo và readiness', weeks:'W2–W3', color:'#2563eb'},
    {id:'P2', label:'Phase 2', title:'Pilot và xác nhận',     weeks:'W4–W5', color:'#d97706'},
    {id:'P3', label:'Phase 3', title:'Go-live theo wave',     weeks:'W6–W9', color:'#16a34a'},
    {id:'P4', label:'Phase 4', title:'Ổn định và bàn giao',   weeks:'W10–W12', color:'#7c3aed'},
  ],
  readinessDimensions: [
    {id:'docReview', label:'Tài liệu',  help:'Playlist, handbook, QR, SOP/WI link'},
    {id:'training',  label:'Đào tạo',   help:'Manager briefing, role training, OJT'},
    {id:'m365',      label:'M365',      help:'Metadata, access, folder routing'},
    {id:'champion',  label:'Champion',  help:'Champion và backup theo ca'},
    {id:'pilot',     label:'Pilot',     help:'Dual-run, retrieval, drill, validation'},
    {id:'golive',    label:'Go-Live',   help:'Go/No-Go, hypercare, handoff'},
  ],
  pillars: [
    {key:'gov',   title:'Governance & gate',    owner:'CEO / Steering',    pass:'Quyết định Go/No-Go đã khóa'},
    {key:'doc',   title:'Tài liệu & playlist',  owner:'QMS Manager',       pass:'Người dùng biết mở tài liệu nào trước'},
    {key:'m365',  title:'M365 & truy cập',      owner:'IT Manager',        pass:'Truy xuất đúng người, đúng quyền'},
    {key:'train', title:'Đào tạo & Champion',   owner:'HR / Dept Manager', pass:'Người dùng tự thao tác được'},
    {key:'pilot', title:'Pilot & xác nhận',     owner:'Production / QA',   pass:'Pilot không còn KPI đỏ'},
    {key:'golive',title:'Go-live & hypercare',  owner:'Cutover Lead',      pass:'Wave go-live ổn định'},
    {key:'dash',  title:'Dashboard & bằng chứng',owner:'QMS / Data Owner', pass:'Số dashboard đáng tin'},
  ],
  departments: [
    {id:'PROD', label:'Sản xuất',         wave:1, color:'#1e40af', owner:'Production Director',  handbook:'../mom/docs/system/organization/02-Department-Handbooks/dept-production-handbook.html',           docs:[{code:'SOP-501',path:'../mom/docs/operations/sops/05-SOP-500/sop-501-production-planning-scheduling-and-dispatch-control.html'},{code:'WI-519',path:'../mom/docs/operations/work-instructions/05-WI-500/wi-519-job-packet-quick-check-and-pre-run-verification.html'}], record:'DEP-PRO + Job Dossier'},
    {id:'ENG',  label:'Kỹ thuật',         wave:1, color:'#9d174d', owner:'Engineering Manager',  handbook:'../mom/docs/system/organization/02-Department-Handbooks/dept-engineering-handbook.html',           docs:[{code:'SOP-303',path:'../mom/docs/operations/sops/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html'},{code:'WI-302',path:'../mom/docs/operations/work-instructions/03-WI-300/wi-302-first-piece-fai-execution-and-evidence-pack.html'}], record:'Part master + Job Dossier'},
    {id:'QA',   label:'Chất lượng',       wave:1, color:'#166534', owner:'QA Manager',           handbook:'../mom/docs/system/organization/02-Department-Handbooks/dept-quality-handbook.html',              docs:[{code:'SOP-605',path:'../mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html'},{code:'WI-201',path:'../mom/docs/operations/work-instructions/02-WI-200/wi-201-quality-gates-hold-points-and-release-execution.html'}], record:'Quality records + DEP-QA'},
    {id:'SCM',  label:'Chuỗi cung ứng',   wave:2, color:'#92400e', owner:'SCM Manager',          handbook:'../mom/docs/system/organization/02-Department-Handbooks/dept-supply-chain-handbook.html',         docs:[{code:'SOP-401',path:'../mom/docs/operations/sops/04-SOP-400/sop-401-supplier-control-and-special-process.html'},{code:'WI-701',path:'../mom/docs/operations/work-instructions/07-WI-700/wi-701-receiving-iqc-traceability-and-put-away.html'}], record:'DEP-SCM + receiving/shipping'},
    {id:'SALES',label:'Kinh doanh / CS',  wave:2, color:'#3730a3', owner:'Sales Manager',        handbook:'../mom/docs/system/organization/02-Department-Handbooks/dept-sales-and-customer-service-handbook.html', docs:[{code:'SOP-201',path:'../mom/docs/operations/sops/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html'},{code:'WI-203',path:'../mom/docs/operations/work-instructions/02-WI-200/wi-203-job-dossier-evidence-pack-and-record-completeness.html'}], record:'DEP-SAL + customer records'},
    {id:'FIN',  label:'Tài chính',        wave:3, color:'#6b21a8', owner:'Finance Manager',      handbook:'../mom/docs/system/organization/02-Department-Handbooks/dept-finance-handbook.html',              docs:[{code:'SOP-803',path:'../mom/docs/operations/sops/08-SOP-800/sop-803-invoicing-job-costing-and-arap.html'}], record:'DEP-FIN + ERP SoR'},
    {id:'HR',   label:'Nhân sự',          wave:3, color:'#9f1239', owner:'HR Manager',           handbook:'../mom/docs/system/organization/02-Department-Handbooks/dept-hr-handbook.html',                   docs:[{code:'SOP-801',path:'../mom/docs/operations/sops/08-SOP-800/sop-801-competence-training-and-certification.html'}], record:'Training records'},
    {id:'IT',   label:'IT',               wave:3, color:'#155e75', owner:'IT Manager',           handbook:'../mom/docs/system/organization/02-Department-Handbooks/dept-it-handbook.html',                   docs:[{code:'ANNEX-113',path:'../mom/docs/operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-113-dashboard-deployment-access-and-refresh-control.html'},{code:'WI-102',path:'../mom/docs/operations/work-instructions/01-WI-100/wi-102-sharepoint-record-sites-libraries-and-permissions-click-by-click.html'}], record:'Digital control + access logs'},
    {id:'EHS',  label:'EHS',              wave:3, color:'#b45309', owner:'EHS Manager',          handbook:'../mom/docs/system/organization/02-Department-Handbooks/dept-ehs-handbook.html',                  docs:[{code:'SOP-802',path:'../mom/docs/operations/sops/08-SOP-800/sop-802-incident-near-miss-and-ehs.html'}], record:'DEP-EHS + incident records'},
    {id:'ERP',  label:'Epicor / ERP',     wave:3, color:'#0f766e', owner:'ERP Owner',            handbook:'../mom/docs/system/organization/02-Department-Handbooks/dept-epicor-handbook.html',                docs:[{code:'ANNEX-115',path:'../mom/docs/operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-115-epicor-transaction-and-interface-map.html'},{code:'ANNEX-118',path:'../mom/docs/operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-118-offline-fallback-kit.html'}], record:'Epicor SoR + interface logs'},
  ],
  docsByGroup: [
    {title:'Điều phối tổng', subtitle:'Cho sponsor · ban điều phối · trưởng nhóm cutover', items:[
      {code:'WI-106',  title:'Kế hoạch triển khai tổng',  path:'../mom/docs/operations/work-instructions/01-WI-100/wi-106-job-order-deployment-master-plan.html'},
      {code:'ANNEX-114', title:'Sổ tay vận hành Go-live', path:'../mom/docs/operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-114-go-live-runbook-and-cutover-control.html'},
      {code:'ANNEX-119', title:'Sổ đăng ký lộ trình thay đổi', path:'../mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-119-change-roadmap-and-priority-register.html'},
      {code:'ANNEX-117', title:'Ma trận leo thang & SLA', path:'../mom/docs/operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-117-escalation-matrix-and-sla.html'},
    ]},
    {title:'Tiếp cận & đào tạo', subtitle:'Cho trưởng phòng · champion · người dùng cuối', items:[
      {code:'WI-105', title:'Hướng dẫn tra cứu tài liệu',   path:'../mom/docs/operations/work-instructions/01-WI-100/wi-105-qms-document-navigation-role-based-reading-path-and-deployment.html'},
      {code:'WI-103', title:'Định tuyến thư mục M365',     path:'../mom/docs/operations/work-instructions/01-WI-100/wi-103-m365-folder-routing-training-competence-and-adoption-for-cnc-job-orders.html'},
      {code:'WI-104', title:'Thẻ tham chiếu nhanh theo vai trò', path:'../mom/docs/operations/work-instructions/01-WI-100/wi-104-m365-folder-routing-quick-cards-by-role-for-cnc-job-order.html'},
      {code:'DRL-E2E', title:'Bài diễn tập đơn hàng đầu-cuối', path:'../mom/docs/training/content/03-Practice-Drills/drill-joborder-e2e.html'},
    ]},
    {title:'Tài liệu nền QMS', subtitle:'Sổ tay · Chính sách · Sổ tay phòng ban', items:[
      {code:'MAN-001',     title:'Sổ tay QMS',          path:'../mom/docs/system/quality-manual/qms-man-001-qms-manual.html'},
      {code:'POL-QMS-001', title:'Chính sách chất lượng', path:'../mom/docs/system/policies/pol-qms-001-quality-policy.html'},
      {code:'POL-QMS-002', title:'Mục tiêu chất lượng', path:'../mom/docs/system/policies/pol-qms-002-quality-objectives.html'},
      {code:'RACI',        title:'Ma trận RACI chính',  path:'../mom/docs/system/organization/04-RACI-Authority/raci-master-matrix.html'},
    ]},
    {title:'Dashboard & bằng chứng', subtitle:'Cho data owner · IT · governance', items:[
      {code:'ANNEX-113', title:'Quản trị dashboard',     path:'../mom/docs/operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-113-dashboard-deployment-access-and-refresh-control.html'},
      {code:'ANNEX-110', title:'Từ điển KPI',            path:'../mom/docs/operations/references/01-ANNEX-100/annex-110-dashboard-kpi-dictionary-and-data-model.html'},
      {code:'WI-202',    title:'Họp điều hành theo tầng', path:'../mom/docs/operations/work-instructions/02-WI-200/wi-202-daily-management-tier-meetings-kpi-and-escalation.html'},
      {code:'WI-901',    title:'Dashboard hiệu suất',    path:'../mom/docs/operations/work-instructions/09-WI-900/wi-901-performance-dashboard.html'},
    ]},
    {title:'Dự phòng & bằng chứng', subtitle:'Cho hypercare · audit · bàn giao', items:[
      {code:'ANNEX-118', title:'Bộ dự phòng offline',   path:'../mom/docs/operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-118-offline-fallback-kit.html'},
      {code:'WI-203',    title:'Bộ bằng chứng hồ sơ',   path:'../mom/docs/operations/work-instructions/02-WI-200/wi-203-job-dossier-evidence-pack-and-record-completeness.html'},
      {code:'WI-201',    title:'Cổng chất lượng',       path:'../mom/docs/operations/work-instructions/02-WI-200/wi-201-quality-gates-hold-points-and-release-execution.html'},
      {code:'ANNEX-135', title:'Kế hoạch lưu hồ sơ',    path:'../mom/docs/operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-135-m365-operational-records-file-plan-by-department-role-and-job.html'},
    ]},
  ],
  kpis: [
    {id:'KPI-FLD-01', label:'Định tuyến đúng thư mục',   target:'>=95', unit:'%', short:'TM'},
    {id:'KPI-FLD-02', label:'Thời gian tra cứu',          target:'<=180', unit:'s', short:'TC'},
    {id:'KPI-TRN-01', label:'Hoàn thành đào tạo',         target:'>=90', unit:'%', short:'ĐT'},
    {id:'KPI-DEP-01', label:'Phủ champion (primary+backup)', target:'>=100',unit:'%', short:'CH'},
    {id:'KPI-DEP-02', label:'Đóng issue đúng hạn',        target:'>=95', unit:'%', short:'ĐI'},
    {id:'KPI-DEP-03', label:'Tỉ lệ thay đổi thất bại',    target:'<=10', unit:'%', short:'TB'},
    {id:'KPI-DEP-04', label:'Lead time thay đổi (ngày)',  target:'<=10', unit:'d', short:'LT'},
    {id:'KPI-DEP-05', label:'Refresh dashboard đúng hạn', target:'>=95', unit:'%', short:'RF'},
  ],
  phaseChecklists: {
    P0:[
      {code:'P0-01', text:'Handbook, SOP, WI, FRM, ANNEX và QR đã đồng bộ'},
      {code:'P0-02', text:'Champion và backup theo ca đã được chỉ định'},
      {code:'P0-03', text:'M365 metadata, permission, folder routing đã test'},
      {code:'P0-04', text:'Dashboard shell đã có owner, source, quick links'},
      {code:'P0-05', text:'Issue register và cadence điều hành đã sẵn sàng'},
    ],
    P1:[
      {code:'P1-01', text:'Manager briefing đã hoàn thành'},
      {code:'P1-02', text:'Champion bootcamp đã pass'},
      {code:'P1-03', text:'Người dùng trong wave đã pass OJT'},
      {code:'P1-04', text:'Baseline KPI và dashboard readiness đã được nạp'},
    ],
    P2:[
      {code:'P2-01', text:'Dual-run và single-run đã xác nhận trên pilot'},
      {code:'P2-02', text:'Retrieval, traceback và wrong-revision drill đã pass'},
      {code:'P2-03', text:'Issue pilot đã đóng hoặc có action plan'},
      {code:'P2-04', text:'Phòng ban core vận hành độc lập được'},
    ],
    P3:[
      {code:'P3-01', text:'Wave hiện tại có command center và support rota'},
      {code:'P3-02', text:'Go-live sign-off, fallback và rollback trigger đã khóa'},
      {code:'P3-03', text:'KPI đỏ = 0 hoặc có exception note'},
      {code:'P3-04', text:'Người dùng mở đúng tài liệu và lưu đúng hồ sơ'},
    ],
    P4:[
      {code:'P4-01', text:'Hypercare Sev-1 = 0 và Sev-2 có workaround ổn định'},
      {code:'P4-02', text:'Dashboard governance, access review và refresh SLA đã khóa'},
      {code:'P4-03', text:'Tài liệu, QR và playlist đã cập nhật theo bài học thật'},
      {code:'P4-04', text:'Owner vận hành thường xuyên đã nhận handoff'},
    ],
  },
  commandCadence: [
    {title:'Họp Thứ Bảy 9:00',     owner:'CEO + QMS Manager',   cadence:'Tuần',    purpose:'Gate review, KPI, decision log'},
    {title:'Daily command center',  owner:'Cutover Lead',        cadence:'Ngày (pilot/hypercare)', purpose:'Severity board, issue age'},
    {title:'Document & data review',owner:'QMS / IT',            cadence:'Tuần',    purpose:'Link, QR, refresh, owner'},
    {title:'Management Review (ISO 9.3)', owner:'CEO + dept heads', cadence:'Quý', purpose:'Mgmt review packet, action items'},
  ],
};

// ── Runtime state (filled by load) ────────────────────────────────────────
const DeployState = {
  loaded: false,
  loading: false,
  program: null,
  meetings: null,
  champions: null,
  readiness: null,
  issues: null,
  drills: null,
  clauses: null,
  audits: null,
  reviews: null,
  users: [],
  me: {username:'', name:'', role:'', canSignOff:false, canEdit:false},
  activeTab: 'overview',
  activeWeek: null, // when not null, week side panel is open
  picker: null,     // {deptId, slot, query, roleFilter} when modal open
  formDialog: null, // {title, kicker, fields, submitLabel, accentColor, onSubmit} when dialog open
};

// ── API ───────────────────────────────────────────────────────────────────
async function deployApi(action, payload){
  if (typeof apiCall !== 'function') {
    throw new Error('apiCall_unavailable');
  }
  const res = await apiCall(action, payload || {}, 'POST', 45000);
  if (!res || res.ok === false) {
    const msg = res && res.error ? res.error : 'unknown';
    throw new Error('api_error:' + msg);
  }
  return res;
}

async function loadDeployState(){
  if (DeployState.loading) return;
  DeployState.loading = true;
  try{
    const res = await deployApi('deploy_state_load', {});
    const d = res.data || {};
    DeployState.program   = d.program   || {weeks:[]};
    DeployState.meetings  = d.meetings  || {meetings:[], agendaTemplate:[]};
    DeployState.champions = d.champions || {champions:{}};
    DeployState.readiness = d.readiness || {deptReadiness:{}, kpiValues:{}, checklistItems:{}};
    DeployState.issues    = d.issues    || {issues:[]};
    DeployState.drills    = d.drills    || {drills:[]};
    DeployState.clauses   = d.clauses   || {clauses:[]};
    DeployState.audits    = d.audits    || {audits:[]};
    DeployState.reviews   = d.reviews   || {reviews:[], inputTemplate:[], outputTemplate:[]};
    DeployState.users     = Array.isArray(d.users) ? d.users : [];
    DeployState.me        = d.me        || DeployState.me;
    DeployState.loaded    = true;
  }catch(e){
    console.error('[deploy] load failed', e);
    DeployState.loaded = false;
  }finally{
    DeployState.loading = false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────
function deployEscape(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function deployNum(v){ const n = parseFloat(v); return Number.isFinite(n) ? n : 0; }
function deployIsoToVi(iso){ if(!iso) return '—'; try{ return new Date(iso).toLocaleString('vi-VN'); }catch(_){ return iso; } }
function deployFmtDate(iso){ if(!iso) return '—'; try{ return new Date(iso).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}); }catch(_){ return iso; } }
function deployTodayIso(){ return new Date().toISOString().slice(0,10); }
function deployGetPhaseDef(id){ return DEPLOY_CONFIG.phases.find(p=>p.id===id) || DEPLOY_CONFIG.phases[0]; }
function deployGetDept(id){ return DEPLOY_CONFIG.departments.find(d=>d.id===id); }
function deployGetWeek(n){ return (DeployState.program && DeployState.program.weeks || []).find(w => (w.n|0) === (n|0)); }

function deployDeptProgress(deptId){
  const r = (DeployState.readiness && DeployState.readiness.deptReadiness && DeployState.readiness.deptReadiness[deptId]) || {};
  const dims = DEPLOY_CONFIG.readinessDimensions;
  let score = 0;
  dims.forEach(d => {
    const v = r[d.id] || 'pending';
    if (v === 'completed') score += 1;
    else if (v === 'in_progress') score += 0.5;
  });
  return score / dims.length;
}
function deployDeptHasBlocker(deptId){
  const r = (DeployState.readiness && DeployState.readiness.deptReadiness && DeployState.readiness.deptReadiness[deptId]) || {};
  return DEPLOY_CONFIG.readinessDimensions.some(d => r[d.id] === 'blocked');
}
function deployKpiRag(kpi, value){
  if (value === '' || value == null) return 'none';
  const num = parseFloat(String(value).replace('%','').replace('s','').replace('d',''));
  if (!Number.isFinite(num)) return 'none';
  const t = kpi.target;
  if (t.startsWith('>=')) {
    const tgt = parseFloat(t.replace('>=',''));
    if (num >= tgt) return 'green';
    if (num >= tgt * 0.85) return 'amber';
    return 'red';
  }
  if (t.startsWith('<=')) {
    const tgt = parseFloat(t.replace('<=',''));
    if (num <= tgt) return 'green';
    if (num <= tgt * 1.25) return 'amber';
    return 'red';
  }
  return 'none';
}
function deployChampionCount(){
  let pass = 0;
  const ch = (DeployState.champions && DeployState.champions.champions) || {};
  Object.values(ch).forEach(d => {
    if (d && d.primary && d.primary.ojtPass) pass++;
    if (d && d.backup  && d.backup.ojtPass)  pass++;
  });
  return pass;
}
function deployStatusIcon(status){
  if (status === 'completed') return '✓';
  if (status === 'in_progress') return '◐';
  if (status === 'blocked') return '⚠';
  return '○';
}
function deployPhaseStatus(phaseId){
  const ps = (DeployState.program && DeployState.program.phaseStatus) || {};
  return ps[phaseId] || 'pending';
}
function deployCurrentPhase(){
  const cur = (DeployState.program && DeployState.program.currentPhase) || 'P0';
  return cur;
}
function deployCurrentWeek(){
  const w = (DeployState.program && DeployState.program.currentWeek);
  return Number.isFinite(w) ? (w|0) : 0;
}
function deployChecklistDoneCount(phaseId){
  const items = DEPLOY_CONFIG.phaseChecklists[phaseId] || [];
  const cl = (DeployState.readiness && DeployState.readiness.checklistItems) || {};
  let done = 0;
  items.forEach((it) => { if (cl[it.code]) done++; });
  return {done, total: items.length};
}
function deployIssuesOpen(){
  const list = (DeployState.issues && DeployState.issues.issues) || [];
  return list.filter(i => (i.status || 'open') !== 'closed');
}
function deployRedSignals(){
  let red = 0;
  DEPLOY_CONFIG.departments.forEach(d => { if (deployDeptHasBlocker(d.id)) red++; });
  const kv = (DeployState.readiness && DeployState.readiness.kpiValues) || {};
  DEPLOY_CONFIG.kpis.forEach(k => { if (deployKpiRag(k, kv[k.id]) === 'red') red++; });
  red += deployNum(kv.sev1Open);
  return red;
}

// ── Tab switching ─────────────────────────────────────────────────────────
function switchDeployTab(tab){
  DeployState.activeTab = tab;
  renderDeployDashboard();
}

// ── Render: hero + summary ────────────────────────────────────────────────
function renderDeployHero(){
  const phase = deployGetPhaseDef(deployCurrentPhase());
  const cw = deployCurrentWeek();
  const wk = deployGetWeek(cw) || {label:'—', date:'—'};
  const cl = deployChecklistDoneCount(phase.id);
  return `
  <section class="deploy-hero">
    <div class="deploy-hero-main">
      <span class="deploy-kicker">Triển khai vận hành · ISO 9001:2015</span>
      <h1>Command Center triển khai vận hành</h1>
      <p>12 tuần · 10 phòng ban · 7 trụ · cadence Thứ Bảy 9:00. State chia sẻ qua backend.</p>
      <div class="deploy-hero-actions">
        <a class="deploy-action-link" href="../mom/docs/operations/work-instructions/01-WI-100/wi-106-job-order-deployment-master-plan.html" target="_blank">WI-106 Kế hoạch tổng</a>
        <a class="deploy-action-link" href="../mom/docs/operations/work-instructions/01-WI-100/wi-105-qms-document-navigation-role-based-reading-path-and-deployment.html" target="_blank">WI-105 Hướng dẫn tra cứu</a>
        <a class="deploy-action-link" href="../mom/docs/operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-114-go-live-runbook-and-cutover-control.html" target="_blank">ANNEX-114 Sổ tay Go-live</a>
      </div>
    </div>
    <div class="deploy-hero-side">
      <div class="hero-side-card hero-phase" style="border-color:${phase.color}">
        <span class="hero-side-label">Pha hiện tại</span>
        <strong>${deployEscape(phase.label)}</strong>
        <div>${deployEscape(phase.title)}</div>
        <div class="hero-side-meta">${deployEscape(phase.weeks)}</div>
      </div>
      <div class="hero-side-card">
        <span class="hero-side-label">Tuần đang theo dõi</span>
        <strong>W${cw} · ${deployFmtDate(wk.date)}</strong>
        <div>${deployEscape(wk.label || '—')}</div>
        <div class="hero-side-meta">Checklist ${cl.done}/${cl.total}</div>
      </div>
    </div>
  </section>`;
}

function renderDeploySummary(){
  const ready = DEPLOY_CONFIG.departments.filter(d => deployDeptProgress(d.id) >= 1).length;
  const total = DEPLOY_CONFIG.departments.length;
  const inProg = DEPLOY_CONFIG.departments.filter(d => { const p = deployDeptProgress(d.id); return p > 0 && p < 1; }).length;
  const chPass = deployChampionCount();
  const chPct = Math.min(100, Math.round((chPass / DEPLOY_CONFIG.championTarget) * 100));
  const blocked = DEPLOY_CONFIG.departments.filter(d => deployDeptHasBlocker(d.id)).length;
  const red = deployRedSignals();
  const issuesOpen = deployIssuesOpen().length;
  return `
  <section class="deploy-summary-grid">
    <div class="deploy-summary-card">
      <span class="summary-label">Phòng ban sẵn sàng</span>
      <strong>${ready}/${total}</strong>
      <div>${inProg} đang trong wave</div>
    </div>
    <div class="deploy-summary-card">
      <span class="summary-label">Champion đạt OJT</span>
      <strong>${chPct}%</strong>
      <div>${chPass}/${DEPLOY_CONFIG.championTarget} đã đạt</div>
    </div>
    <div class="deploy-summary-card">
      <span class="summary-label">Vấn đề đang mở</span>
      <strong>${issuesOpen}</strong>
      <div>Bảng nghiêm trọng đang theo dõi</div>
    </div>
    <div class="deploy-summary-card ${red > 0 ? 'summary-alert' : ''}">
      <span class="summary-label">Tín hiệu đỏ</span>
      <strong>${red}</strong>
      <div>${blocked} phòng chặn · ${red - blocked} KPI/sev đỏ</div>
    </div>
  </section>`;
}

// ── Tab 1: Overview ───────────────────────────────────────────────────────
function renderTabOverview(){
  const kv = (DeployState.readiness && DeployState.readiness.kpiValues) || {};
  return `
  <div class="deploy-tab-panel active" id="dtab-overview">
    <section class="deploy-section">
      <div class="deploy-section-head"><h2>Lộ trình 5 pha</h2><span>Nhấn pha để chuyển — chỉ CEO/QMS</span></div>
      <div class="deploy-phase-timeline">
        ${DEPLOY_CONFIG.phases.map(p => renderPhaseNode(p)).join('<div class="phase-connector"></div>')}
      </div>
    </section>
    <section class="deploy-section">
      <div class="deploy-section-head"><h2>7 trụ triển khai</h2><span>Thiếu trụ nào = chưa go-live</span></div>
      <div class="deploy-pillar-grid">
        ${DEPLOY_CONFIG.pillars.map(pl => `
          <div class="deploy-pillar-card">
            <h3>${deployEscape(pl.title)}</h3>
            <div class="pillar-owner">${deployEscape(pl.owner)}</div>
            <div class="pillar-pass">${deployEscape(pl.pass)}</div>
          </div>`).join('')}
      </div>
    </section>
    <section class="deploy-section">
      <div class="deploy-section-head"><h2>KPI triển khai</h2><span>${DeployState.me.canEdit ? 'Nhập giá trị thực tế' : 'Chỉ đọc — không có quyền edit'}</span></div>
      <div class="kpi-mini-grid">
        ${DEPLOY_CONFIG.kpis.map(k => renderKpiCard(k, kv[k.id])).join('')}
      </div>
    </section>
    <section class="deploy-section">
      <div class="deploy-section-head"><h2>Cadence điều hành</h2><span>Nhịp họp cố định</span></div>
      <div class="cadence-list">
        ${DEPLOY_CONFIG.commandCadence.map(c => `
          <div class="cadence-item">
            <strong>${deployEscape(c.title)}</strong>
            <span class="cadence-period">${deployEscape(c.cadence)}</span>
            <p>${deployEscape(c.owner)} · ${deployEscape(c.purpose)}</p>
          </div>`).join('')}
      </div>
    </section>
  </div>`;
}

function renderPhaseNode(phase){
  const st = deployPhaseStatus(phase.id);
  const cls = st === 'completed' ? 'phase-done' : st === 'in_progress' ? 'phase-active' : 'phase-pending';
  const disabled = !DeployState.me.canSignOff;
  return `
  <button class="phase-node ${cls}" ${disabled ? 'disabled aria-disabled="true"' : ''} onclick="deploySetPhase('${phase.id}')" title="${deployEscape(phase.title)}">
    <div class="phase-info">
      <strong>${deployEscape(phase.label)}</strong>
      <span>${deployEscape(phase.title)}</span>
      <span class="phase-weeks">${deployEscape(phase.weeks)}</span>
    </div>
    <div class="phase-status-dot" style="background:${phase.color}"></div>
  </button>`;
}

function renderKpiCard(kpi, value){
  const v = value == null ? '' : String(value);
  const rag = deployKpiRag(kpi, v);
  const ro = !DeployState.me.canEdit;
  return `
  <div class="kpi-mini-card kpi-rag-${rag}">
    <div class="kpi-mini-icon">${deployEscape(kpi.short)}</div>
    <div class="kpi-mini-body">
      <div class="kpi-mini-label">${deployEscape(kpi.label)}</div>
      <div class="kpi-mini-target">Target ${deployEscape(kpi.target)}${deployEscape(kpi.unit)}</div>
    </div>
    <input type="text" class="kpi-mini-input" value="${deployEscape(v)}" placeholder="—" ${ro ? 'disabled' : ''} onchange="deployUpdateMetric('${deployEscape(kpi.id)}', this.value)">
  </div>`;
}

// ── Tab 2: Lộ trình (Timeline) ────────────────────────────────────────────
function renderTabTimeline(){
  const weeks = (DeployState.program && DeployState.program.weeks) || [];
  const cw = deployCurrentWeek();
  return `
  <div class="deploy-tab-panel active" id="dtab-timeline">
    <section class="deploy-section">
      <div class="deploy-section-head">
        <h2>Lộ trình 12 tuần · Thứ Bảy 9:00</h2>
        <span>Click một tuần để mở panel chi tiết</span>
      </div>
      <div class="deploy-timeline">
        ${weeks.map(w => renderTimelineWeek(w, cw)).join('')}
      </div>
    </section>
    <section class="deploy-section">
      <div class="deploy-section-head"><h2>Gate decision log</h2><span>Tuần đã ký Go/No-Go</span></div>
      <div class="deploy-decision-log">
        ${renderDecisionLog(weeks)}
      </div>
    </section>
  </div>`;
}

function renderTimelineWeek(w, currentWeek){
  const phase = deployGetPhaseDef(w.phase);
  const isCurrent = (w.n|0) === (currentWeek|0);
  const so = w.signOff;
  let statusClass = w.status === 'completed' ? 'tlw-done' : w.status === 'blocked' ? 'tlw-blocked' : w.status === 'conditional' ? 'tlw-cond' : isCurrent ? 'tlw-current' : 'tlw-pending';
  const decisionBadge = so ? `<span class="tlw-decision tlw-decision-${so.decision}">${so.decision === 'go' ? '✓ GO' : so.decision === 'no_go' ? '✗ NO-GO' : '◐ COND'}</span>` : '';
  return `
  <button class="tl-week ${statusClass}" onclick="deployOpenWeek(${w.n|0})" style="--phase-color:${phase.color}">
    <div class="tlw-head">
      <span class="tlw-num">W${w.n|0}</span>
      <span class="tlw-date">${deployFmtDate(w.date)}</span>
    </div>
    <div class="tlw-phase">${deployEscape(phase.label)}</div>
    <div class="tlw-label">${deployEscape(w.label || '')}</div>
    <div class="tlw-foot">
      <span class="tlw-gate">${(w.gateCodes||[]).join(' · ') || '—'}</span>
      ${decisionBadge}
    </div>
  </button>`;
}

function renderDecisionLog(weeks){
  const signed = weeks.filter(w => w.signOff).sort((a,b) => (b.n|0) - (a.n|0));
  if (!signed.length) return '<div class="deploy-empty">Chưa có quyết định gate nào được ký.</div>';
  return `<table class="deploy-decision-table">
    <thead><tr><th>Tuần</th><th>Ngày họp</th><th>Quyết định</th><th>Ký bởi</th><th>Ghi chú</th></tr></thead>
    <tbody>${signed.map(w => `
      <tr>
        <td><strong>W${w.n|0}</strong> ${deployEscape(w.label||'')}</td>
        <td>${deployFmtDate(w.date)}</td>
        <td><span class="tlw-decision tlw-decision-${w.signOff.decision}">${w.signOff.decision === 'go' ? '✓ GO' : w.signOff.decision === 'no_go' ? '✗ NO-GO' : '◐ COND'}</span></td>
        <td>${deployEscape(w.signOff.name || w.signOff.by || '')}<br><small>${deployIsoToVi(w.signOff.at)}</small></td>
        <td>${deployEscape(w.signOff.notes || '')}</td>
      </tr>`).join('')}</tbody>
  </table>`;
}

// ── Tab 3: Họp & Gate ─────────────────────────────────────────────────────
function renderTabMeetings(){
  const meetings = ((DeployState.meetings && DeployState.meetings.meetings) || []).slice().sort((a,b) => (b.weekN|0) - (a.weekN|0));
  const tpl = (DeployState.meetings && DeployState.meetings.agendaTemplate) || [];
  return `
  <div class="deploy-tab-panel active" id="dtab-meetings">
    <section class="deploy-section">
      <div class="deploy-section-head">
        <h2>Khuôn họp Thứ Bảy 9:00 — 60 phút</h2>
        <span>Mẫu agenda cố định, lặp đúng mỗi tuần</span>
      </div>
      <div class="agenda-template-grid">
        ${tpl.map(t => `
          <div class="agenda-slot">
            <span class="agenda-slot-time">${deployEscape(t.slot)}'</span>
            <strong>${deployEscape(t.label)}</strong>
            <div class="agenda-owner">${deployEscape(t.owner)}</div>
            <p>${deployEscape(t.note)}</p>
          </div>`).join('')}
      </div>
    </section>
    <section class="deploy-section">
      <div class="deploy-section-head">
        <h2>Lịch họp & biên bản</h2>
        <span>${meetings.length} biên bản · click một tuần ở tab Lộ trình để tạo mới</span>
      </div>
      ${meetings.length === 0 ? '<div class="deploy-empty">Chưa có biên bản. Mở tab <strong>Lộ trình</strong>, click tuần và bấm <strong>Tạo biên bản</strong>.</div>' : `
      <div class="deploy-meeting-list">
        ${meetings.map(m => renderMeetingCard(m)).join('')}
      </div>`}
    </section>
  </div>`;
}

function renderMeetingCard(m){
  const week = deployGetWeek(m.weekN);
  const phase = week ? deployGetPhaseDef(week.phase) : null;
  const so = m.signOff;
  return `
  <div class="meeting-card ${so ? 'meeting-locked' : ''}">
    <div class="meeting-card-head">
      <div>
        <strong>W${m.weekN|0} · ${deployEscape(m.title || (week ? week.label : ''))}</strong>
        <div class="meeting-meta">${deployFmtDate(m.date || (week && week.date))} · ${phase ? deployEscape(phase.label) : ''}</div>
      </div>
      ${so
        ? `<span class="meeting-signoff-badge">🔒 Ký bởi ${deployEscape(so.name || so.by)}<br><small>${deployIsoToVi(so.at)}</small></span>`
        : `<button class="deploy-btn" onclick="deployOpenWeek(${m.weekN|0})">Mở chi tiết →</button>`
      }
    </div>
    ${m.minutes ? `<div class="meeting-minutes-preview">${deployEscape(m.minutes.substring(0,200))}${m.minutes.length > 200 ? '…' : ''}</div>` : ''}
    ${(m.decisions && m.decisions.length) ? `
      <div class="meeting-decisions">
        ${m.decisions.map(d => `<span class="meeting-decision-chip">• ${deployEscape(d)}</span>`).join('')}
      </div>` : ''}
  </div>`;
}

// ── Tab 4: Phòng ban + champion ───────────────────────────────────────────
function renderTabDepartments(){
  return `
  <div class="deploy-tab-panel active" id="dtab-departments">
    <section class="deploy-section">
      <div class="deploy-section-head"><h2>Wave rollout</h2><span>3 wave · go-live theo thứ tự rủi ro</span></div>
      <div class="deploy-wave-grid">
        ${[1,2,3].map(w => renderWaveColumn(w)).join('')}
      </div>
    </section>
    <section class="deploy-section">
      <div class="deploy-section-head"><h2>Bảng readiness 6 chiều</h2><span>Click ô để cycle pending → in_progress → completed → blocked</span></div>
      <div class="deploy-table-wrap">
        <table class="deploy-heatmap">
          <thead>
            <tr>
              <th>Phòng ban</th>
              <th>Wave</th>
              ${DEPLOY_CONFIG.readinessDimensions.map(dim => `<th title="${deployEscape(dim.help)}">${deployEscape(dim.label)}</th>`).join('')}
              <th>Tiến độ</th>
            </tr>
          </thead>
          <tbody>${DEPLOY_CONFIG.departments.map(d => renderReadinessRow(d)).join('')}</tbody>
        </table>
      </div>
      <div class="heatmap-legend">
        <span class="hm-legend-item"><span class="hm-dot hm-pending">○</span>Chưa bắt đầu</span>
        <span class="hm-legend-item"><span class="hm-dot hm-in_progress">◐</span>Đang thực hiện</span>
        <span class="hm-legend-item"><span class="hm-dot hm-completed">✓</span>Hoàn thành</span>
        <span class="hm-legend-item"><span class="hm-dot hm-blocked">⚠</span>Bị chặn</span>
      </div>
    </section>
    <section class="deploy-section">
      <div class="deploy-section-head"><h2>Champion roster</h2><span>Primary + Backup mỗi phòng — ${deployChampionCount()}/${DEPLOY_CONFIG.championTarget} đã pass OJT</span></div>
      <div class="champion-grid">
        ${DEPLOY_CONFIG.departments.map(d => renderChampionCard(d)).join('')}
      </div>
    </section>
  </div>`;
}

function renderWaveColumn(wave){
  const depts = DEPLOY_CONFIG.departments.filter(d => d.wave === wave);
  return `
  <div class="wave-card">
    <div class="wave-card-head"><strong>Wave ${wave}</strong><span>${depts.length} phòng</span></div>
    <div class="wave-card-body">
      ${depts.map(d => {
        const pct = Math.round(deployDeptProgress(d.id) * 100);
        return `
        <div class="wave-dept-row">
          <div class="wave-dept-main">
            <span class="wave-color" style="background:${d.color}"></span>
            <span>${deployEscape(d.label)}</span>
          </div>
          <span class="wave-score">${pct}%</span>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function renderReadinessRow(dept){
  const r = (DeployState.readiness && DeployState.readiness.deptReadiness && DeployState.readiness.deptReadiness[dept.id]) || {};
  const pct = Math.round(deployDeptProgress(dept.id) * 100);
  const ro = !DeployState.me.canEdit;
  return `
  <tr>
    <td>
      <div class="readiness-dept-name">
        <span class="wave-color" style="background:${dept.color}"></span>
        <span>${deployEscape(dept.label)}</span>
        <small>${deployEscape(dept.owner)}</small>
      </div>
    </td>
    <td><span class="deploy-wave-badge wave-${dept.wave}">Wave ${dept.wave}</span></td>
    ${DEPLOY_CONFIG.readinessDimensions.map(dim => {
      const v = r[dim.id] || 'pending';
      const onClick = ro ? '' : `onclick="deployCycleReadiness('${dept.id}','${dim.id}')"`;
      return `<td class="heatmap-cell hm-${v} ${ro ? 'hm-readonly' : ''}" ${onClick} title="${deployEscape(dept.label)} · ${deployEscape(dim.label)} · ${v}">${deployStatusIcon(v)}</td>`;
    }).join('')}
    <td><strong>${pct}%</strong><div class="dept-mini-bar"><span style="width:${pct}%;background:${dept.color}"></span></div></td>
  </tr>`;
}

function renderChampionCard(dept){
  const ch = (DeployState.champions && DeployState.champions.champions && DeployState.champions.champions[dept.id]) || {primary:{}, backup:{}, shift:'A'};
  const ro = !DeployState.me.canEdit;
  return `
  <div class="champion-card">
    <div class="champion-card-head">
      <span class="wave-color" style="background:${dept.color}"></span>
      <strong>${deployEscape(dept.label)}</strong>
      <span class="champion-shift">Ca ${deployEscape(ch.shift || 'A')}</span>
    </div>
    <div class="champion-form">
      ${renderChampionSlot(dept, 'primary', 'Champion', ch.primary || {}, ro)}
      ${renderChampionSlot(dept, 'backup',  'Backup',   ch.backup  || {}, ro)}
      <button class="deploy-btn deploy-btn-sm" ${ro?'disabled':''} onclick="deploySaveChampion('${dept.id}')">Lưu thay đổi</button>
    </div>
  </div>`;
}

function renderChampionSlot(dept, slot, label, person, ro){
  const filled = !!(person && person.name && !person.name.startsWith('['));
  const u = filled ? findUserByName(person.name) : null;
  return `
  <div class="champion-slot ${filled?'champion-slot-filled':'champion-slot-empty'}" data-deploy-champion-slot="${dept.id}|${slot}">
    <div class="champion-slot-row">
      <span class="champion-slot-label">${deployEscape(label)}</span>
      <div class="champion-slot-actions">
        ${!ro ? `<button class="deploy-btn deploy-btn-xs" type="button" onclick="deployOpenPicker('${dept.id}','${slot}')">${filled?'🔄 Đổi người':'🔍 Chọn người'}</button>` : ''}
        ${filled && !ro ? `<button class="deploy-btn-link" type="button" onclick="deployClearChampion('${dept.id}','${slot}')" title="Bỏ chọn">✕</button>` : ''}
      </div>
    </div>
    ${filled ? `
      <div class="champion-person">
        <div class="champion-person-main">
          <strong>${deployEscape(person.name)}</strong>
          ${u ? `<span class="champion-jd">${deployEscape(u.jd_title || u.title || u.role)}</span>` : ''}
        </div>
        <div class="champion-person-meta">
          ${person.phone ? `<span>📞 ${deployEscape(person.phone)}</span>` : ''}
          ${u && u.dept ? `<span>🏢 ${deployEscape(u.dept)}</span>` : ''}
          ${u && u.employee_id ? `<span>🆔 ${deployEscape(u.employee_id)}</span>` : ''}
        </div>
      </div>
    ` : `
      <div class="champion-person-empty">${deployEscape(person.name || '— Chưa chọn —')}</div>
    `}
    <label class="champion-ojt">
      <input type="checkbox" ${person.ojtPass?'checked':''} ${ro?'disabled':''} data-deploy-champion="${dept.id}|${slot}|ojtPass">
      Đã pass OJT bootcamp
    </label>
    <!-- Hidden mirror fields so deploySaveChampion can read uniformly -->
    <input type="hidden" data-deploy-champion="${dept.id}|${slot}|name"  value="${deployEscape(person.name||'')}">
    <input type="hidden" data-deploy-champion="${dept.id}|${slot}|phone" value="${deployEscape(person.phone||'')}">
    <input type="hidden" data-deploy-champion="${dept.id}|${slot}|m365"  value="${deployEscape(person.m365||'')}">
  </div>`;
}

function findUserByName(name){
  if (!name) return null;
  const list = DeployState.users || [];
  return list.find(u => u.name === name) || list.find(u => u.name && u.name.toLowerCase() === name.toLowerCase()) || null;
}

// ── Tab 5: Tài liệu ───────────────────────────────────────────────────────
function renderTabDocs(){
  const drills = ((DeployState.drills && DeployState.drills.drills) || []).slice().sort((a,b) => (b.recordedAt || '').localeCompare(a.recordedAt || ''));
  const drillStats = computeDrillStats(drills);
  return `
  <div class="deploy-tab-panel active" id="dtab-docs">
    <section class="deploy-section">
      <div class="deploy-section-head"><h2>Trung tâm tài liệu</h2><span>Đường tắt theo nhóm vai trò</span></div>
      <div class="doc-group-grid">
        ${DEPLOY_CONFIG.docsByGroup.map(g => `
          <div class="doc-group-card">
            <h3>${deployEscape(g.title)}</h3>
            <p>${deployEscape(g.subtitle)}</p>
            <div class="doc-group-links">
              ${g.items.map(it => `
                <a class="deploy-doc-card" href="${deployEscape(it.path)}" target="_blank">
                  <span class="deploy-doc-code">${deployEscape(it.code)}</span>
                  <span class="deploy-doc-title">${deployEscape(it.title)}</span>
                </a>`).join('')}
            </div>
          </div>`).join('')}
      </div>
    </section>
    <section class="deploy-section">
      <div class="deploy-section-head"><h2>Diễn tập tra cứu tài liệu · KPI ≤3 phút</h2><span>${drillStats.total} lượt · đạt ${drillStats.passPct}%</span></div>
      <div class="drill-recorder">
        <form onsubmit="event.preventDefault(); deployRecordDrill();" class="drill-form" id="deployDrillForm">
          <input type="date" id="drillDate" value="${deployTodayIso()}" ${DeployState.me.canEdit?'':'disabled'}>
          <input type="text" id="drillPerson" placeholder="Người thực hiện" ${DeployState.me.canEdit?'':'disabled'}>
          <select id="drillDept" ${DeployState.me.canEdit?'':'disabled'}>
            <option value="">— Phòng —</option>
            ${DEPLOY_CONFIG.departments.map(d => `<option value="${d.id}">${deployEscape(d.label)}</option>`).join('')}
          </select>
          <input type="text" id="drillDoc" placeholder="Mã tài liệu (vd SOP-501)" ${DeployState.me.canEdit?'':'disabled'}>
          <input type="number" id="drillSeconds" placeholder="Số giây" min="1" max="900" ${DeployState.me.canEdit?'':'disabled'}>
          <button type="submit" class="deploy-btn" ${DeployState.me.canEdit?'':'disabled'}>Ghi lượt diễn tập</button>
        </form>
        <div class="drill-log">
          ${drills.slice(0, 10).map(d => `
            <div class="drill-row drill-${d.pass ? 'pass' : 'fail'}">
              <span class="drill-pass-icon">${d.pass ? '✓' : '✗'}</span>
              <span class="drill-meta"><strong>${deployEscape(d.person)}</strong> · ${deployEscape(d.deptId)} · ${deployEscape(d.docCode)}</span>
              <span class="drill-seconds">${d.seconds}s</span>
              <small>${deployFmtDate(d.date)}</small>
            </div>`).join('')}
          ${drills.length === 0 ? '<div class="deploy-empty">Chưa có lượt diễn tập nào. Mục tiêu KPI: ≤180 giây (3 phút).</div>' : ''}
        </div>
      </div>
    </section>
  </div>`;
}

function computeDrillStats(drills){
  const total = drills.length;
  const pass = drills.filter(d => d.pass).length;
  return {total, pass, passPct: total ? Math.round(pass*100/total) : 0};
}

// ── Tab 6: Issues ─────────────────────────────────────────────────────────
function renderTabIssues(){
  const issues = ((DeployState.issues && DeployState.issues.issues) || []).slice().sort((a,b) => (a.sev|0) - (b.sev|0) || (b.updatedAt||'').localeCompare(a.updatedAt||''));
  const open = issues.filter(i => i.status !== 'closed').length;
  const closed = issues.length - open;
  return `
  <div class="deploy-tab-panel active" id="dtab-issues">
    <section class="deploy-section">
      <div class="deploy-section-head">
        <h2>Sổ vấn đề · ${open} mở · ${closed} đã đóng</h2>
        <span>Bảng nghiêm trọng đang theo dõi</span>
      </div>
      <div class="issue-toolbar">
        ${DeployState.me.canEdit ? `<button class="deploy-btn" onclick="deployOpenIssueForm()">+ Ghi vấn đề mới</button>` : ''}
      </div>
      <div class="issue-list">
        ${issues.length === 0 ? '<div class="deploy-empty">Chưa có vấn đề nào. Bảng nghiêm trọng sẽ kích hoạt khi pilot bắt đầu (W4).</div>' : ''}
        ${issues.map(i => renderIssueRow(i)).join('')}
      </div>
    </section>
  </div>`;
}

function renderIssueRow(i){
  const dept = deployGetDept(i.deptId);
  return `
  <div class="issue-row issue-sev-${i.sev|0} issue-status-${deployEscape(i.status||'open')}">
    <span class="issue-sev-badge">SEV-${i.sev|0}</span>
    <div class="issue-main">
      <strong>${deployEscape(i.title)}</strong>
      <div class="issue-meta">
        W${i.weekN|0} · ${dept ? deployEscape(dept.label) : deployEscape(i.deptId)} · Owner ${deployEscape(i.owner || '—')}
        ${i.capaLink ? ` · <a href="${deployEscape(i.capaLink)}" target="_blank">${deployEscape(i.capaCode || 'CAPA')}</a>` : ''}
      </div>
    </div>
    <div class="issue-actions">
      ${DeployState.me.canEdit ? `<button class="deploy-btn-link" type="button" title="Sửa issue" onclick="deployEditIssue('${deployEscape(i.id)}')">✎</button>` : ''}
      ${(i.sev|0) <= 2 && !i.capaLink && DeployState.me.canEdit ? `<button class="deploy-btn deploy-btn-sm" onclick="deployBridgeCapa('${deployEscape(i.id)}')" title="Mở CAPA case từ issue này">→ CAPA</button>` : ''}
      <select class="issue-status-select" ${DeployState.me.canEdit?'':'disabled'} onchange="deployUpdateIssueStatus('${deployEscape(i.id)}', this.value)">
        <option value="open" ${i.status==='open'?'selected':''}>Đang mở</option>
        <option value="workaround" ${i.status==='workaround'?'selected':''}>Có giải pháp tạm</option>
        <option value="closed" ${i.status==='closed'?'selected':''}>Đã đóng</option>
      </select>
    </div>
  </div>`;
}

// ── Tab 7: ISO 9001 clause map ────────────────────────────────────────────
function renderTabIso(){
  const list = (DeployState.clauses && DeployState.clauses.clauses) || [];
  const sections = {};
  list.forEach(c => { (sections[c.section] = sections[c.section] || []).push(c); });
  const coverage = isoComputeCoverage(list);
  return `
  <div class="deploy-tab-panel active" id="dtab-iso">
    <section class="deploy-section">
      <div class="deploy-section-head">
        <h2>ISO 9001:2015 — Bản đồ điều khoản</h2>
        <span>${coverage.covered}/${coverage.total} điều khoản đã ánh xạ · độ phủ ${coverage.pct}%</span>
      </div>
      <div class="iso-coverage-bar"><span style="width:${coverage.pct}%"></span></div>
    </section>
    ${Object.keys(sections).map(sec => `
      <section class="deploy-section">
        <div class="deploy-section-head"><h2>${deployEscape(sec)}</h2><span>${sections[sec].length} điều khoản</span></div>
        <div class="iso-clause-grid">
          ${sections[sec].map(c => renderClauseCard(c)).join('')}
        </div>
      </section>
    `).join('')}
  </div>`;
}

function isoComputeCoverage(list){
  const total = list.length;
  let covered = 0;
  list.forEach(c => {
    const hasPillar = Array.isArray(c.pillars) && c.pillars.length > 0;
    const hasDoc    = Array.isArray(c.docs) && c.docs.length > 0;
    if (hasPillar && hasDoc) covered++;
  });
  return {total, covered, pct: total ? Math.round(covered * 100 / total) : 0};
}

function renderClauseCard(c){
  const auditList = (DeployState.audits && DeployState.audits.audits) || [];
  const findings = [];
  auditList.forEach(a => (a.findings || []).forEach(f => {
    if (f.clauseRef === c.code) findings.push({audit: a.id, f});
  }));
  const hasFinding = findings.length > 0;
  const sev = findings.find(x => x.f.severity === 'major') ? 'major' : findings.find(x => x.f.severity === 'minor') ? 'minor' : 'clean';
  return `
  <div class="iso-clause-card iso-sev-${sev}">
    <div class="iso-clause-head">
      <span class="iso-clause-code">${deployEscape(c.code)}</span>
      <strong>${deployEscape(c.title)}</strong>
    </div>
    <div class="iso-clause-meta">
      <div class="iso-clause-pillars">
        ${(c.pillars || []).map(p => {
          const pl = DEPLOY_CONFIG.pillars.find(x => x.key === p);
          return `<span class="iso-pillar-chip">${deployEscape(pl ? pl.title : p)}</span>`;
        }).join('')}
      </div>
      <div class="iso-clause-docs">
        ${(c.docs || []).map(d => `<span class="dwp-doc-chip">${deployEscape(d)}</span>`).join('')}
      </div>
    </div>
    ${hasFinding ? `<div class="iso-clause-findings">⚠ ${findings.length} phát hiện · ${findings.map(x => x.f.severity).join(', ')}</div>` : ''}
  </div>`;
}

// ── Tab 8: Audit (internal cycle ISO 9.2) ─────────────────────────────────
function renderTabAudit(){
  const audits = ((DeployState.audits && DeployState.audits.audits) || []).slice().sort((a,b) => (a.plannedDate||'').localeCompare(b.plannedDate||''));
  const totalFindings = audits.reduce((sum, a) => sum + ((a.findings||[]).length), 0);
  const openFindings  = audits.reduce((sum, a) => sum + ((a.findings||[]).filter(f => f.status !== 'closed').length), 0);
  const auditStatusLabels = {scheduled:'Đã lên lịch', in_progress:'Đang thực hiện', completed:'Hoàn tất', closed:'Đã đóng'};
  return `
  <div class="deploy-tab-panel active" id="dtab-audit">
    <section class="deploy-section">
      <div class="deploy-section-head">
        <h2>Đánh giá nội bộ (ISO 9.2) — ${audits.length} cuộc · ${openFindings}/${totalFindings} phát hiện đang mở</h2>
        <span>Chu kỳ tối thiểu 1 năm — chia 3–4 quý</span>
      </div>
      ${DeployState.me.canEdit ? `<div class="audit-toolbar"><button class="deploy-btn" onclick="deployOpenAuditForm()">+ Lên lịch cuộc đánh giá</button></div>` : ''}
      <div class="audit-list">
        ${audits.length === 0 ? '<div class="deploy-empty">Chưa có cuộc đánh giá nội bộ nào.</div>' : ''}
        ${audits.map(a => renderAuditCard(a)).join('')}
      </div>
    </section>
  </div>`;
}

function renderAuditCard(a){
  const findings = a.findings || [];
  const major  = findings.filter(f => f.severity === 'major').length;
  const minor  = findings.filter(f => f.severity === 'minor').length;
  const obs    = findings.filter(f => f.severity === 'observation').length;
  const opp    = findings.filter(f => f.severity === 'opportunity').length;
  const open   = findings.filter(f => f.status !== 'closed').length;
  return `
  <div class="audit-card audit-status-${deployEscape(a.status||'scheduled')}">
    <div class="audit-card-head">
      <div>
        <strong>${deployEscape(a.id)} · ${deployEscape(a.cycle)}</strong>
        <div class="audit-meta">
          ${a.plannedDate ? 'Dự kiến ' + deployFmtDate(a.plannedDate) : ''}
          ${a.executedDate ? ' · Thực hiện ' + deployFmtDate(a.executedDate) : ''}
          · <span class="audit-status-badge">${deployEscape(({scheduled:'Đã lên lịch', in_progress:'Đang thực hiện', completed:'Hoàn tất', closed:'Đã đóng'})[a.status]||a.status||'scheduled')}</span>
        </div>
      </div>
      <div class="audit-finding-counts">
        ${major  ? `<span class="audit-fc fc-major">${major} major</span>` : ''}
        ${minor  ? `<span class="audit-fc fc-minor">${minor} minor</span>` : ''}
        ${obs    ? `<span class="audit-fc fc-obs">${obs} quan sát</span>` : ''}
        ${opp    ? `<span class="audit-fc fc-opp">${opp} cơ hội</span>` : ''}
        ${!findings.length ? `<span class="audit-fc fc-empty">— chưa có phát hiện —</span>` : ''}
      </div>
    </div>
    <div class="audit-card-body">
      <div class="audit-scope">
        <small>Phạm vi điều khoản:</small> ${(a.scope || []).map(s => `<span class="dwp-doc-chip">Cl ${deployEscape(s)}</span>`).join(' ')}
      </div>
      <div class="audit-scope">
        <small>Phòng ban:</small> ${(a.scopeDepts || []).map(s => `<span class="audit-dept-chip">${deployEscape(s)}</span>`).join(' ')}
      </div>
      <div class="audit-scope">
        <small>Đánh giá viên dẫn:</small> ${deployEscape(a.leadAuditor || '—')}
      </div>
    </div>
    ${findings.length ? `
      <div class="audit-findings">
        ${findings.map(f => `
          <div class="audit-finding audit-finding-${deployEscape(f.severity||'minor')}">
            <span class="finding-sev-badge">${deployEscape((f.severity||'minor').toUpperCase())}</span>
            <span class="finding-clause">Cl ${deployEscape(f.clauseRef||'—')}</span>
            <span class="finding-desc">${deployEscape(f.description||'')}</span>
            <span class="finding-status">${deployFmtFindingStatus(f.status)}</span>
            ${f.capaLink ? `<a href="${deployEscape(f.capaLink)}" target="_blank">CAPA</a>` : ''}
            ${DeployState.me.canEdit ? `<button class="deploy-btn-link" type="button" title="Sửa phát hiện" onclick="deployEditFinding('${deployEscape(a.id)}','${deployEscape(f.id)}')">✎</button>` : ''}
          </div>
        `).join('')}
      </div>` : ''}
    ${DeployState.me.canEdit ? `<div class="audit-actions">
      <button class="deploy-btn deploy-btn-sm" onclick="deployOpenFindingForm('${deployEscape(a.id)}')">+ Ghi phát hiện</button>
      <button class="deploy-btn deploy-btn-sm deploy-btn-ghost" onclick="deployEditAudit('${deployEscape(a.id)}')">✎ Sửa audit</button>
    </div>` : ''}
  </div>`;
}

function deployFmtFindingStatus(s){
  const map = {open:'Mở', capa:'Đã chuyển CAPA', closed:'Đã đóng'};
  return deployEscape(map[s] || s || '—');
}

// ── Tab 9: Management Review (ISO 9.3) ────────────────────────────────────
function renderTabReview(){
  const reviews = ((DeployState.reviews && DeployState.reviews.reviews) || []).slice().sort((a,b) => (b.date||'').localeCompare(a.date||''));
  const inputs = (DeployState.reviews && DeployState.reviews.inputTemplate) || [];
  const outputs = (DeployState.reviews && DeployState.reviews.outputTemplate) || [];
  return `
  <div class="deploy-tab-panel active" id="dtab-review">
    <section class="deploy-section">
      <div class="deploy-section-head">
        <h2>Xem xét của lãnh đạo (ISO 9.3) — ${reviews.length} biên bản</h2>
        <span>Hằng quý — 12 đầu vào + 3 đầu ra theo điều khoản 9.3.2 / 9.3.3</span>
      </div>
      ${DeployState.me.canEdit ? `<div class="review-toolbar"><button class="deploy-btn" onclick="deployOpenReviewForm()">+ Tạo biên bản quý mới</button></div>` : ''}
    </section>
    ${reviews.length === 0 ? `
      <section class="deploy-section">
        <div class="deploy-empty">
          Chưa có biên bản Xem xét lãnh đạo. Mỗi quý CEO + ban điều hành cần họp xem xét.<br>
          <small>Mẫu đầu vào: ${inputs.length} mục — Mẫu đầu ra: ${outputs.length} mục.</small>
        </div>
      </section>
    ` : reviews.map(r => renderReviewCard(r, inputs, outputs)).join('')}
  </div>`;
}

function renderReviewCard(r, inputs, outputs){
  const so = r.signOff;
  const inputsData = r.inputs || {};
  const outputsData = r.outputs || {};
  return `
  <section class="deploy-section review-card ${so?'review-signed':''}">
    <div class="review-head">
      <div>
        <strong>${deployEscape(r.cycle || r.id)}</strong>
        <div class="review-meta">${deployFmtDate(r.date)} · ${(r.attendees||[]).length} người tham dự</div>
      </div>
      ${so ? `<span class="meeting-signoff-badge">🔒 Ký ${deployEscape(so.name||so.by)} · ${deployIsoToVi(so.at)}</span>` : ''}
    </div>
    <details class="review-details">
      <summary>📋 Đầu vào — Điều khoản 9.3.2 — ${inputs.length} mục</summary>
      <div class="review-grid">
        ${inputs.map(it => `
          <div class="review-row">
            <div class="review-row-head">
              <span class="review-clause">${deployEscape(it.clause)}</span>
              <strong>${deployEscape(it.label)}</strong>
            </div>
            <div class="review-row-value">${deployEscape(inputsData[it.key] || '—')}</div>
          </div>`).join('')}
      </div>
    </details>
    <details class="review-details">
      <summary>🎯 Đầu ra — Điều khoản 9.3.3 — ${outputs.length} mục</summary>
      <div class="review-grid">
        ${outputs.map(it => `
          <div class="review-row">
            <div class="review-row-head">
              <span class="review-clause">${deployEscape(it.clause)}</span>
              <strong>${deployEscape(it.label)}</strong>
            </div>
            <div class="review-row-value">${deployEscape(outputsData[it.key] || '—')}</div>
          </div>`).join('')}
      </div>
    </details>
    ${!so && DeployState.me.canEdit ? `
      <div class="review-buttons">
        <button class="deploy-btn deploy-btn-sm" onclick="deployEditReview('${deployEscape(r.id)}')">✎ Sửa biên bản</button>
        ${DeployState.me.canSignOff ? `<button class="deploy-btn deploy-btn-go deploy-btn-sm" onclick="deploySignOffReview('${deployEscape(r.id)}')">🔒 Ký khóa</button>` : ''}
      </div>` : ''}
  </section>`;
}

// ── Week side panel ───────────────────────────────────────────────────────
function renderWeekPanel(){
  if (DeployState.activeWeek == null) return '';
  const wn = DeployState.activeWeek | 0;
  const w = deployGetWeek(wn);
  if (!w) return '';
  const phase = deployGetPhaseDef(w.phase);
  const cl = (DeployState.readiness && DeployState.readiness.checklistItems) || {};
  const items = DEPLOY_CONFIG.phaseChecklists[phase.id] || [];
  const gateItems = items.filter(it => (w.gateCodes || []).includes(it.code));
  const so = w.signOff;
  const me = DeployState.me;
  const meetings = (DeployState.meetings && DeployState.meetings.meetings) || [];
  const existingMeeting = meetings.find(m => (m.weekN|0) === wn);
  const issues = ((DeployState.issues && DeployState.issues.issues) || []).filter(i => (i.weekN|0) === wn);
  const kv = (DeployState.readiness && DeployState.readiness.kpiValues) || {};

  return `
  <div class="deploy-week-overlay" onclick="deployCloseWeek(event)">
    <aside class="deploy-week-panel" onclick="event.stopPropagation()" style="--phase-color:${phase.color}">
      <header class="dwp-header">
        <div>
          <span class="dwp-kicker">${deployEscape(phase.label)} · ${deployEscape(phase.title)}</span>
          <h2>W${wn} · ${deployFmtDate(w.date)} · ${deployEscape(w.label)}</h2>
        </div>
        <button class="dwp-close" onclick="deployCloseWeek()" aria-label="Đóng">×</button>
      </header>

      <section class="dwp-section">
        <h3>Mục tiêu tuần</h3>
        <p>${deployEscape(w.objective || '')}</p>
        ${(w.deliverables && w.deliverables.length) ? `
          <ul class="dwp-deliverables">
            ${w.deliverables.map(d => `<li>${deployEscape(d)}</li>`).join('')}
          </ul>` : ''}
      </section>

      <section class="dwp-section">
        <h3>Gate checklist · ${gateItems.length} mục</h3>
        <div class="dwp-checklist">
          ${gateItems.map(it => {
            const checked = !!cl[it.code];
            const stamp = checked && typeof cl[it.code] === 'object' ? cl[it.code] : null;
            return `
            <label class="dwp-check-item ${checked?'checked':''}">
              <input type="checkbox" ${checked?'checked':''} ${me.canEdit?'':'disabled'} onchange="deployToggleChecklist('${it.code}', this.checked)">
              <span class="dwp-check-code">${deployEscape(it.code)}</span>
              <span class="dwp-check-text">${deployEscape(it.text)}</span>
              ${stamp ? `<small class="dwp-stamp">${deployEscape(stamp.by||'')} · ${deployIsoToVi(stamp.at||'')}</small>` : ''}
            </label>`;
          }).join('')}
        </div>
      </section>

      <section class="dwp-section">
        <h3>Tài liệu liên quan</h3>
        <div class="dwp-required-docs">
          ${(w.requiredDocs || []).map(code => `<span class="dwp-doc-chip">${deployEscape(code)}</span>`).join('') || '<span class="deploy-empty-inline">— (không neo tài liệu)</span>'}
        </div>
      </section>

      <section class="dwp-section">
        <h3>Issues phát sinh tuần W${wn}</h3>
        <div class="dwp-issue-list">
          ${issues.length === 0 ? '<span class="deploy-empty-inline">Chưa có issue.</span>' :
            issues.map(i => `<div class="dwp-issue-row issue-sev-${i.sev|0}"><span class="issue-sev-badge">SEV-${i.sev|0}</span> ${deployEscape(i.title)} <small>· ${deployEscape(i.status||'open')}</small></div>`).join('')
          }
        </div>
      </section>

      <section class="dwp-section">
        <h3>Biên bản họp</h3>
        ${renderWeekMeetingForm(existingMeeting, w, kv)}
      </section>

      <section class="dwp-section dwp-signoff">
        <h3>Quyết định Gate</h3>
        ${so ? `
          <div class="dwp-signoff-locked">
            <strong>${so.decision === 'go' ? '✓ GO' : so.decision === 'no_go' ? '✗ NO-GO' : '◐ CONDITIONAL'}</strong>
            <div>Ký bởi <strong>${deployEscape(so.name||so.by)}</strong> (${deployEscape(so.role)}) · ${deployIsoToVi(so.at)}</div>
            ${so.notes ? `<p>${deployEscape(so.notes)}</p>` : ''}
          </div>
        ` : me.canSignOff ? `
          <div class="dwp-signoff-form">
            <textarea id="dwpSignOffNotes" placeholder="Ghi chú quyết định (tùy chọn)" rows="2"></textarea>
            <div class="dwp-signoff-buttons">
              <button class="deploy-btn deploy-btn-go" onclick="deploySignOffWeek(${wn}, 'go')">✓ GO</button>
              <button class="deploy-btn deploy-btn-cond" onclick="deploySignOffWeek(${wn}, 'conditional')">◐ CONDITIONAL</button>
              <button class="deploy-btn deploy-btn-nogo" onclick="deploySignOffWeek(${wn}, 'no_go')">✗ NO-GO</button>
            </div>
            <small class="dwp-signoff-hint">Chỉ CEO + QMS Manager có quyền ký gate.</small>
          </div>
        ` : `
          <div class="dwp-empty">Bạn không có quyền ký gate. Cần vai trò <strong>CEO</strong> hoặc <strong>QMS Manager</strong>.</div>
        `}
      </section>
    </aside>
  </div>`;
}

function renderWeekMeetingForm(meeting, week, kv){
  const m = meeting || {minutes:'', decisions:[], attendees:[], kpiSnapshot:{}};
  const ro = !DeployState.me.canEdit || !!(meeting && meeting.signOff);
  const signed = !!(meeting && meeting.signOff);
  return `
  <div class="dwp-meeting-form">
    <label class="dwp-field">
      <span>Người tham dự (phân cách dấu phẩy)</span>
      <input type="text" id="dwpAttendees" value="${deployEscape((m.attendees||[]).join(', '))}" ${ro?'disabled':''}>
    </label>
    <label class="dwp-field">
      <span>Biên bản · ghi chú họp</span>
      <textarea id="dwpMinutes" rows="4" ${ro?'disabled':''}>${deployEscape(m.minutes||'')}</textarea>
    </label>
    <label class="dwp-field">
      <span>Quyết định (mỗi dòng 1 quyết định)</span>
      <textarea id="dwpDecisions" rows="3" ${ro?'disabled':''}>${deployEscape((m.decisions||[]).join('\n'))}</textarea>
    </label>
    <div class="dwp-meeting-buttons">
      ${signed ? `
        <span class="meeting-signoff-badge">🔒 Đã khóa · ${deployIsoToVi(meeting.signOff.at)}</span>
      ` : `
        ${!ro ? `<button class="deploy-btn" onclick="deploySaveMeeting(${week.n|0})">Lưu biên bản</button>` : ''}
        ${meeting && DeployState.me.canSignOff ? `<button class="deploy-btn deploy-btn-go" onclick="deploySignOffMeeting('${deployEscape(meeting.id)}')">🔒 Ký khóa biên bản</button>` : ''}
      `}
    </div>
  </div>`;
}

// ── Generic form dialog ───────────────────────────────────────────────────
// Single modal that takes a field schema and a submit callback. Replaces
// chained prompt() flows with a sane one-screen UX. Field types:
//   text · number · date · textarea · select · multiselect · checkbox · static
function renderFormDialog(){
  const f = DeployState.formDialog;
  if (!f) return '';
  const accent = f.accentColor || '#1e3a8a';
  return `
  <div class="deploy-form-overlay" onclick="deployCloseFormDialog(event)">
    <div class="deploy-form-dialog" onclick="event.stopPropagation()" style="--phase-color:${accent}">
      <header class="dfd-head">
        <div>
          ${f.kicker ? `<span class="dp-kicker">${deployEscape(f.kicker)}</span>` : ''}
          <h2>${deployEscape(f.title || 'Nhập thông tin')}</h2>
          ${f.description ? `<p class="dfd-desc">${deployEscape(f.description)}</p>` : ''}
        </div>
        <button class="dwp-close" type="button" onclick="deployCloseFormDialog()" aria-label="Đóng">×</button>
      </header>
      <form id="deployFormDialogForm" class="dfd-form" onsubmit="event.preventDefault(); deployFormDialogSubmit();">
        <div class="dfd-body">
          ${(f.fields || []).map(fld => renderFormField(fld)).join('')}
        </div>
        <footer class="dfd-foot">
          ${f.hint ? `<span class="dfd-foot-hint">${deployEscape(f.hint)}</span>` : '<span></span>'}
          <div class="dfd-foot-buttons">
            <button type="button" class="deploy-btn-link" onclick="deployCloseFormDialog()">Hủy</button>
            <button type="submit" class="deploy-btn">${deployEscape(f.submitLabel || 'Lưu')}</button>
          </div>
        </footer>
      </form>
    </div>
  </div>`;
}

function renderFormField(f){
  if (f.type === 'static') {
    return `<div class="dfd-static"><span class="dfd-static-label">${deployEscape(f.label||'')}</span><div class="dfd-static-value">${deployEscape(f.value||'')}</div></div>`;
  }
  if (f.type === 'separator') {
    return `<div class="dfd-separator">${deployEscape(f.label||'')}</div>`;
  }
  const req = f.required ? '<span class="dfd-required">*</span>' : '';
  const hint = f.hint ? `<small class="dfd-hint">${deployEscape(f.hint)}</small>` : '';
  switch (f.type) {
    case 'textarea':
      return `
      <label class="dfd-field">
        <span class="dfd-label">${deployEscape(f.label)}${req}</span>
        <textarea data-form-key="${deployEscape(f.key)}" rows="${f.rows||3}" placeholder="${deployEscape(f.placeholder||'')}" ${f.required?'required':''}>${deployEscape(f.value||'')}</textarea>
        ${hint}
      </label>`;
    case 'select':
      return `
      <label class="dfd-field">
        <span class="dfd-label">${deployEscape(f.label)}${req}</span>
        <select data-form-key="${deployEscape(f.key)}" ${f.required?'required':''}>
          ${(f.options||[]).map(o => `<option value="${deployEscape(o.value)}" ${String(o.value)===String(f.value||'')?'selected':''}>${deployEscape(o.label)}</option>`).join('')}
        </select>
        ${hint}
      </label>`;
    case 'multiselect':
      return `
      <div class="dfd-field">
        <span class="dfd-label">${deployEscape(f.label)}${req}</span>
        <div class="dfd-chips" data-form-key="${deployEscape(f.key)}">
          ${(f.options||[]).map(o => {
            const checked = (Array.isArray(f.value) ? f.value : []).map(String).includes(String(o.value));
            return `<label class="dfd-chip ${checked?'dfd-chip-on':''}"><input type="checkbox" value="${deployEscape(o.value)}" ${checked?'checked':''} onchange="this.parentElement.classList.toggle('dfd-chip-on', this.checked)"><span>${deployEscape(o.label)}</span></label>`;
          }).join('')}
        </div>
        ${hint}
      </div>`;
    case 'checkbox':
      return `
      <label class="dfd-checkbox">
        <input type="checkbox" data-form-key="${deployEscape(f.key)}" ${f.value?'checked':''}>
        <span>${deployEscape(f.label)}${req}</span>
        ${hint}
      </label>`;
    case 'number':
      return `
      <label class="dfd-field">
        <span class="dfd-label">${deployEscape(f.label)}${req}</span>
        <input type="number" data-form-key="${deployEscape(f.key)}" value="${deployEscape(f.value||'')}" ${f.min!=null?`min="${f.min}"`:''} ${f.max!=null?`max="${f.max}"`:''} ${f.step!=null?`step="${f.step}"`:''} ${f.required?'required':''}>
        ${hint}
      </label>`;
    case 'date':
      return `
      <label class="dfd-field">
        <span class="dfd-label">${deployEscape(f.label)}${req}</span>
        <input type="date" data-form-key="${deployEscape(f.key)}" value="${deployEscape(f.value||'')}" ${f.required?'required':''}>
        ${hint}
      </label>`;
    case 'password':
      return `
      <label class="dfd-field">
        <span class="dfd-label">${deployEscape(f.label)}${req}</span>
        <input type="password" inputmode="numeric" autocomplete="off" data-form-key="${deployEscape(f.key)}" value="" placeholder="${deployEscape(f.placeholder||'')}" ${f.required?'required':''} ${f.maxLength?`maxlength="${f.maxLength}"`:''}>
        ${hint}
      </label>`;
    case 'text':
    default:
      return `
      <label class="dfd-field">
        <span class="dfd-label">${deployEscape(f.label)}${req}</span>
        <input type="text" data-form-key="${deployEscape(f.key)}" value="${deployEscape(f.value||'')}" placeholder="${deployEscape(f.placeholder||'')}" ${f.required?'required':''}>
        ${hint}
      </label>`;
  }
}

function deployOpenFormDialog(config){
  DeployState.formDialog = config;
  renderDeployDashboard();
  setTimeout(() => {
    const first = document.querySelector('#deployFormDialogForm [data-form-key]');
    if (first && typeof first.focus === 'function') first.focus();
  }, 50);
}
function deployCloseFormDialog(ev){
  if (ev && ev.target && !ev.target.classList.contains('deploy-form-overlay')) return;
  DeployState.formDialog = null;
  renderDeployDashboard();
}
function deployFormDialogSubmit(){
  const f = DeployState.formDialog;
  if (!f) return;
  const values = {};
  (f.fields || []).forEach(fld => {
    if (fld.type === 'static' || fld.type === 'separator') return;
    if (fld.type === 'multiselect') {
      const boxes = document.querySelectorAll(`[data-form-key="${fld.key}"] input[type="checkbox"]`);
      values[fld.key] = Array.from(boxes).filter(c => c.checked).map(c => c.value);
    } else if (fld.type === 'checkbox') {
      const el = document.querySelector(`[data-form-key="${fld.key}"]`);
      values[fld.key] = el ? !!el.checked : false;
    } else if (fld.type === 'number') {
      const el = document.querySelector(`[data-form-key="${fld.key}"]`);
      values[fld.key] = el && el.value !== '' ? Number(el.value) : null;
    } else {
      const el = document.querySelector(`[data-form-key="${fld.key}"]`);
      values[fld.key] = el ? el.value : '';
    }
  });
  // Validate required
  const missing = (f.fields || []).filter(fld => fld.required && (values[fld.key] == null || values[fld.key] === '' || (Array.isArray(values[fld.key]) && values[fld.key].length === 0)));
  if (missing.length) {
    alert('Vui lòng nhập đủ: ' + missing.map(m => m.label).join(', '));
    return;
  }
  const onSubmit = f.onSubmit;
  DeployState.formDialog = null;
  renderDeployDashboard();
  if (typeof onSubmit === 'function') {
    Promise.resolve(onSubmit(values)).catch(e => {
      console.error('[deploy] form submit failed', e);
      alert('Lỗi lưu: ' + (e && e.message || e));
    });
  }
}

// ── User picker modal ─────────────────────────────────────────────────────
function renderPickerModal(){
  const p = DeployState.picker;
  if (!p) return '';
  const dept = deployGetDept(p.deptId);
  if (!dept) return '';
  const q = (p.query || '').trim().toLowerCase();
  const roleFilter = p.roleFilter || '';
  const all = DeployState.users || [];
  // Already-assigned set (to mark used names across roster)
  const used = new Set();
  Object.entries((DeployState.champions && DeployState.champions.champions) || {}).forEach(([dId, ch]) => {
    ['primary','backup'].forEach(s => {
      const n = (ch && ch[s] && ch[s].name) || '';
      if (n && !n.startsWith('[')) used.add(`${n}|${dId}|${s}`);
    });
  });

  // Rank: dept match → role hint match → name contains query
  const deptHints = {
    PROD:  ['PRO','PROD'],
    ENG:   ['ENG','TECH'],
    QA:    ['QA','QC','QUALITY'],
    SCM:   ['SCM','WH','PURCH'],
    SALES: ['SAL','SALES','CS','CSR'],
    FIN:   ['FIN','ACC'],
    HR:    ['HR'],
    IT:    ['IT'],
    EHS:   ['EHS','SAF'],
    ERP:   ['ERP','IT'],
  };
  const roleHints = {
    PROD:  ['production_director','cnc_workshop_manager','shift_leader','production_planner','cnc_operator'],
    ENG:   ['engineering_lead','process_engineer'],
    QA:    ['qa_manager','qc_inspector'],
    SCM:   ['supply_chain_manager','buyer','warehouse_clerk'],
    SALES: ['sales_manager','estimator'],
    FIN:   ['finance_manager','gl_payroll_accountant'],
    HR:    ['hr_manager'],
    IT:    ['it_manager','it_admin','epicor_admin'],
    EHS:   ['ehs_manager','cleaning_packaging_supervisor'],
    ERP:   ['epicor_admin','it_admin'],
  };
  const dh = deptHints[p.deptId] || [];
  const rh = roleHints[p.deptId] || [];

  let list = all.slice();
  if (roleFilter === 'dept_only') {
    list = list.filter(u => dh.some(h => (u.dept||'').toUpperCase().startsWith(h)));
  } else if (roleFilter === 'role_hint') {
    list = list.filter(u => rh.includes(u.role));
  } else if (roleFilter === 'managers') {
    list = list.filter(u => /manager|director|lead|admin/.test(u.role||''));
  }
  if (q) {
    list = list.filter(u =>
      (u.name||'').toLowerCase().includes(q) ||
      (u.role||'').toLowerCase().includes(q) ||
      (u.dept||'').toLowerCase().includes(q) ||
      (u.jd_title||'').toLowerCase().includes(q) ||
      (u.username||'').toLowerCase().includes(q)
    );
  }
  // Sort: dept match first, then role hint, then alpha
  list.sort((a, b) => {
    const ad = dh.some(h => (a.dept||'').toUpperCase().startsWith(h)) ? 0 : 1;
    const bd = dh.some(h => (b.dept||'').toUpperCase().startsWith(h)) ? 0 : 1;
    if (ad !== bd) return ad - bd;
    const ar = rh.includes(a.role) ? 0 : 1;
    const br = rh.includes(b.role) ? 0 : 1;
    if (ar !== br) return ar - br;
    return (a.name||'').localeCompare(b.name||'', 'vi');
  });

  const slotLabel = p.slot === 'primary' ? 'Champion (primary)' : 'Backup';

  return `
  <div class="deploy-picker-overlay" onclick="deployClosePicker(event)">
    <div class="deploy-picker" onclick="event.stopPropagation()" style="--phase-color:${dept.color}">
      <header class="dp-head">
        <div>
          <span class="dp-kicker">${deployEscape(dept.label)} · ${deployEscape(slotLabel)}</span>
          <h2>Chọn người vào vai trò</h2>
        </div>
        <button class="dwp-close" onclick="deployClosePicker()" aria-label="Đóng">×</button>
      </header>

      <div class="dp-controls">
        <input type="text" id="dpSearch" class="dp-search" placeholder="🔍 Tìm theo tên / vai trò / phòng / username..." value="${deployEscape(p.query||'')}" oninput="deployPickerSetQuery(this.value)" autofocus>
        <div class="dp-filter-chips">
          ${renderPickerChip('',          'Tất cả',     roleFilter, all.length)}
          ${renderPickerChip('dept_only', 'Cùng phòng', roleFilter, all.filter(u => dh.some(h => (u.dept||'').toUpperCase().startsWith(h))).length)}
          ${renderPickerChip('role_hint', 'Vai trò phù hợp', roleFilter, all.filter(u => rh.includes(u.role)).length)}
          ${renderPickerChip('managers',  'Quản lý / Lead',  roleFilter, all.filter(u => /manager|director|lead|admin/.test(u.role||'')).length)}
        </div>
        <div class="dp-summary">${list.length}/${all.length} người · ưu tiên người cùng phòng và vai trò phù hợp</div>
      </div>

      <div class="dp-list">
        ${list.length === 0 ? '<div class="deploy-empty">Không có người nào khớp bộ lọc.</div>' : ''}
        ${list.map(u => renderPickerRow(u, p.deptId, used, dh, rh)).join('')}
      </div>

      <footer class="dp-foot">
        <span class="dp-foot-hint">Danh sách này dùng chung nguồn Người dùng trong Admin.</span>
      </footer>
    </div>
  </div>`;
}

function renderPickerChip(value, label, current, count){
  const active = (current||'') === value;
  return `<button class="dp-chip ${active?'dp-chip-active':''}" type="button" onclick="deployPickerSetFilter('${value}')">${deployEscape(label)} <span>${count}</span></button>`;
}

function renderPickerRow(u, deptId, used, deptHints, roleHints){
  const inSameDept = deptHints.some(h => (u.dept||'').toUpperCase().startsWith(h));
  const matchesRole = roleHints.includes(u.role);
  const usedElsewhere = Array.from(used).find(k => k.startsWith(u.name + '|') && !k.endsWith(`|${deptId}|primary`) && !k.endsWith(`|${deptId}|backup`));
  return `
  <button class="dp-row ${inSameDept?'dp-row-dept':''} ${matchesRole?'dp-row-role':''}" type="button" onclick="deployPickerSelect('${deployEscape(u.username)}')">
    <div class="dp-row-main">
      <strong>${deployEscape(u.name)}</strong>
      <span class="dp-jd">${deployEscape(u.jd_title || u.title || u.role)}</span>
    </div>
    <div class="dp-row-meta">
      ${u.dept ? `<span class="dp-dept">🏢 ${deployEscape(u.dept)}</span>` : ''}
      ${u.phone ? `<span>📞 ${deployEscape(u.phone)}</span>` : ''}
      ${u.username ? `<span class="dp-username">@${deployEscape(u.username)}</span>` : ''}
      ${inSameDept ? '<span class="dp-badge dp-badge-dept">cùng phòng</span>' : ''}
      ${matchesRole ? '<span class="dp-badge dp-badge-role">vai trò phù hợp</span>' : ''}
      ${usedElsewhere ? '<span class="dp-badge dp-badge-used">đã ở phòng khác</span>' : ''}
    </div>
  </button>`;
}

function deployOpenPicker(deptId, slot){
  DeployState.picker = {deptId, slot, query:'', roleFilter:'dept_only'};
  renderDeployDashboard();
  setTimeout(() => { const el = document.getElementById('dpSearch'); if (el) el.focus(); }, 40);
}
function deployClosePicker(ev){
  if (ev && ev.target && !ev.target.classList.contains('deploy-picker-overlay')) return;
  DeployState.picker = null;
  renderDeployDashboard();
}
function deployPickerSetQuery(v){
  if (!DeployState.picker) return;
  DeployState.picker.query = v;
  renderDeployDashboard();
  // Restore focus + cursor position
  const el = document.getElementById('dpSearch');
  if (el) { el.focus(); el.selectionStart = el.selectionEnd = el.value.length; }
}
function deployPickerSetFilter(value){
  if (!DeployState.picker) return;
  DeployState.picker.roleFilter = value;
  renderDeployDashboard();
}

function deployPickerSelect(username){
  const p = DeployState.picker;
  if (!p) return;
  const u = (DeployState.users || []).find(x => x.username === username);
  if (!u) return;
  // Patch local champion state and persist
  const champs = DeployState.champions || {champions:{}};
  if (!champs.champions[p.deptId]) champs.champions[p.deptId] = {primary:{}, backup:{}, shift:'A'};
  champs.champions[p.deptId][p.slot] = {
    name: u.name,
    phone: u.phone || '',
    m365: u.email || '',
    ojtPass: !!(champs.champions[p.deptId][p.slot] && champs.champions[p.deptId][p.slot].ojtPass),
  };
  DeployState.champions = champs;
  DeployState.picker = null;
  renderDeployDashboard();
  deploySaveChampion(p.deptId);
}

function deployPickerAssignManual(){
  alert('Vui lòng thêm người dùng trong Admin > Người dùng trước khi bổ nhiệm.');
}

function deployClearChampion(deptId, slot){
  if (!confirm('Bỏ chọn người ở vị trí này?')) return;
  const champs = DeployState.champions || {champions:{}};
  if (!champs.champions[deptId]) champs.champions[deptId] = {primary:{}, backup:{}, shift:'A'};
  champs.champions[deptId][slot] = {name:'', phone:'', m365:'', ojtPass:false};
  DeployState.champions = champs;
  renderDeployDashboard();
  deploySaveChampion(deptId);
}

// ── Actions ───────────────────────────────────────────────────────────────
async function deployCycleReadiness(deptId, dimId){
  const cur = (DeployState.readiness?.deptReadiness?.[deptId]?.[dimId]) || 'pending';
  const cycle = ['pending', 'in_progress', 'completed', 'blocked'];
  const next = cycle[(cycle.indexOf(cur)+1) % cycle.length];
  try{
    const res = await deployApi('deploy_readiness_cycle', {deptId, dimId, value: next});
    DeployState.readiness = res.data;
    renderDeployDashboard();
  }catch(e){ console.error('[deploy] cycle failed', e); alert('Lỗi cập nhật readiness: ' + e.message); }
}

async function deployUpdateMetric(key, value){
  try{
    const res = await deployApi('deploy_metric_update', {key, value});
    DeployState.readiness = res.data;
    renderDeployDashboard();
  }catch(e){ console.error('[deploy] metric failed', e); alert('Lỗi cập nhật KPI: ' + e.message); }
}

async function deployToggleChecklist(code, checked){
  try{
    const res = await deployApi('deploy_checklist_toggle', {key: code, checked});
    DeployState.readiness = res.data;
    renderDeployDashboard();
  }catch(e){ console.error('[deploy] checklist failed', e); alert('Lỗi: ' + e.message); }
}

async function deploySetPhase(phaseId){
  if (!DeployState.me.canSignOff) { alert('Cần quyền CEO/QMS Manager để chuyển pha.'); return; }
  if (!confirm('Chuyển pha hoạt động sang ' + phaseId + '? Hành động này được audit.')) return;
  try{
    const res = await deployApi('deploy_phase_set', {phaseId});
    DeployState.program = res.data;
    renderDeployDashboard();
  }catch(e){ console.error('[deploy] phase failed', e); alert('Lỗi chuyển pha: ' + e.message); }
}

function deployOpenWeek(n){
  DeployState.activeWeek = n;
  renderDeployDashboard();
}
function deployCloseWeek(ev){
  if (ev && ev.target && !ev.target.classList.contains('deploy-week-overlay')) return;
  DeployState.activeWeek = null;
  renderDeployDashboard();
}

async function deploySaveMeeting(weekN){
  const wk = deployGetWeek(weekN);
  if (!wk) return;
  const attendees = (document.getElementById('dwpAttendees')?.value || '').split(',').map(s => s.trim()).filter(Boolean);
  const minutes = document.getElementById('dwpMinutes')?.value || '';
  const decisions = (document.getElementById('dwpDecisions')?.value || '').split('\n').map(s => s.trim()).filter(Boolean);
  const kv = (DeployState.readiness && DeployState.readiness.kpiValues) || {};
  const existing = ((DeployState.meetings?.meetings) || []).find(m => (m.weekN|0) === (weekN|0));
  try{
    const res = await deployApi('deploy_meeting_save', {
      id: existing ? existing.id : '',
      weekN, date: wk.date, title: wk.label,
      attendees, minutes, decisions,
      agenda: (DeployState.meetings && DeployState.meetings.agendaTemplate) || [],
      kpiSnapshot: {...kv},
    });
    DeployState.meetings = res.data;
    renderDeployDashboard();
  }catch(e){ console.error('[deploy] save meeting failed', e); alert('Lỗi lưu biên bản: ' + e.message); }
}

async function deploySignOffMeeting(id){
  if (!DeployState.me.canSignOff) { alert('Cần quyền CEO/QMS Manager để ký.'); return; }
  if (!confirm('Khóa biên bản này? Sau khi khóa không sửa được.')) return;
  try{
    const res = await deployApi('deploy_meeting_signoff', {id});
    DeployState.meetings = res.data;
    renderDeployDashboard();
  }catch(e){ console.error('[deploy] meeting signoff failed', e); alert('Lỗi: ' + e.message); }
}

async function deploySignOffWeek(weekN, decision){
  if (!DeployState.me.canSignOff) { alert('Cần quyền CEO/QMS Manager để ký gate.'); return; }
  const notes = document.getElementById('dwpSignOffNotes')?.value || '';
  if (!confirm('Ký gate W' + weekN + ' với quyết định ' + decision.toUpperCase() + '?')) return;
  try{
    const res = await deployApi('deploy_week_signoff', {weekN, decision, notes});
    DeployState.program = res.data;
    renderDeployDashboard();
  }catch(e){ console.error('[deploy] week signoff failed', e); alert('Lỗi ký gate: ' + e.message); }
}

async function deploySaveChampion(deptId){
  const get = (slot, field) => {
    const sel = `[data-deploy-champion="${deptId}|${slot}|${field}"]`;
    const el = document.querySelector(sel);
    if (!el) return field === 'ojtPass' ? false : '';
    return field === 'ojtPass' ? !!el.checked : el.value;
  };
  const payload = {
    deptId,
    primary: { name: get('primary','name'), phone: get('primary','phone'), m365: '', ojtPass: get('primary','ojtPass') },
    backup:  { name: get('backup','name'),  phone: get('backup','phone'),  m365: '', ojtPass: get('backup','ojtPass') },
    shift: 'A',
  };
  try{
    const res = await deployApi('deploy_champion_save', payload);
    DeployState.champions = res.data;
    renderDeployDashboard();
  }catch(e){ console.error('[deploy] champion failed', e); alert('Lỗi lưu champion: ' + e.message); }
}

function deployOpenIssueForm(existing){
  const isEdit = !!(existing && existing.id);
  deployOpenFormDialog({
    kicker: isEdit ? `Sửa issue ${existing.id}` : 'Ghi issue mới',
    title: isEdit ? 'Cập nhật vấn đề' : 'Ghi vấn đề / sự cố trong triển khai',
    accentColor: '#dc2626',
    submitLabel: isEdit ? 'Cập nhật' : 'Ghi vấn đề',
    fields: [
      {key:'title', label:'Tiêu đề', type:'text', required:true, value: existing?.title || '',
        placeholder:'Mô tả ngắn (≤80 ký tự)'},
      {key:'sev', label:'Mức nghiêm trọng', type:'select', required:true, value: String(existing?.sev || 3),
        options: [
          {value:'1', label:'Sev-1 — Dừng vận hành / Critical'},
          {value:'2', label:'Sev-2 — Ảnh hưởng lớn / High'},
          {value:'3', label:'Sev-3 — Bất tiện / Low'},
        ]},
      {key:'deptId', label:'Phòng ban', type:'select', required:true, value: existing?.deptId || 'QA',
        options: DEPLOY_CONFIG.departments.map(d => ({value:d.id, label: d.label}))},
      {key:'owner', label:'Owner xử lý', type:'text', required:true,
        value: existing?.owner || (DeployState.me.name || DeployState.me.username || ''),
        placeholder:'Họ tên người nhận xử lý'},
      {key:'weekN', label:'Tuần phát sinh', type:'number', required:true,
        value: existing?.weekN != null ? existing.weekN : deployCurrentWeek(),
        min: 0, max: 12, hint:'Tuần W0..W12 trong chương trình.'},
      {key:'status', label:'Trạng thái', type:'select', value: existing?.status || 'open',
        options: [
          {value:'open', label:'Đang mở'},
          {value:'workaround', label:'Có workaround'},
          {value:'closed', label:'Đã đóng'},
        ]},
      {key:'capaLink', label:'Link CAPA (nếu có)', type:'text', value: existing?.capaLink || '',
        placeholder:'/portal.html#eqms?capa=CAPA-...', hint:'Nếu Sev-1/2, dùng nút "→ CAPA" để tự sinh stub.'},
    ],
    onSubmit: (v) => deploySaveIssue({
      ...(existing || {}),
      title: v.title,
      sev: parseInt(v.sev, 10) || 3,
      deptId: v.deptId,
      owner: v.owner,
      weekN: parseInt(v.weekN, 10) || 0,
      status: v.status,
      capaLink: v.capaLink || '',
    }),
  });
}

function deployEditIssue(id){
  const list = (DeployState.issues && DeployState.issues.issues) || [];
  const it = list.find(x => x.id === id);
  if (it) deployOpenIssueForm(it);
}

async function deploySaveIssue(payload){
  try{
    const res = await deployApi('deploy_issue_save', payload);
    DeployState.issues = res.data;
    renderDeployDashboard();
  }catch(e){ console.error('[deploy] issue failed', e); alert('Lỗi lưu issue: ' + e.message); }
}

async function deployUpdateIssueStatus(id, status){
  const list = (DeployState.issues && DeployState.issues.issues) || [];
  const cur = list.find(i => i.id === id);
  if (!cur) return;
  await deploySaveIssue({...cur, status});
}

async function deployRecordDrill(){
  const f = id => document.getElementById(id);
  const date = f('drillDate').value;
  const person = f('drillPerson').value.trim();
  const deptId = f('drillDept').value;
  const docCode = f('drillDoc').value.trim();
  const seconds = parseInt(f('drillSeconds').value, 10) || 0;
  if (!person || !deptId || !docCode || !seconds) { alert('Điền đủ các ô.'); return; }
  try{
    const res = await deployApi('deploy_drill_record', {date, person, deptId, docCode, seconds});
    DeployState.drills = res.data;
    renderDeployDashboard();
  }catch(e){ console.error('[deploy] drill failed', e); alert('Lỗi ghi drill: ' + e.message); }
}

function deployOpenAuditForm(existing){
  const isEdit = !!(existing && existing.id);
  const todayQuarter = 'Q' + (Math.floor(new Date().getMonth()/3)+1) + '-' + new Date().getFullYear();
  const clauseSections = ['4', '5', '6', '7', '8', '9', '10'];
  const sectionLabels = {
    '4':'4 — Bối cảnh', '5':'5 — Lãnh đạo', '6':'6 — Hoạch định',
    '7':'7 — Hỗ trợ', '8':'8 — Vận hành', '9':'9 — Đánh giá hiệu lực', '10':'10 — Cải tiến'
  };
  deployOpenFormDialog({
    kicker: isEdit ? 'Cập nhật audit nội bộ' : 'Lên lịch audit nội bộ',
    title: isEdit ? `Cập nhật ${existing.id}` : 'Lên lịch đánh giá nội bộ ISO 9.2',
    accentColor: '#d97706',
    submitLabel: isEdit ? 'Cập nhật' : 'Lên lịch',
    fields: [
      {key:'cycle', label:'Chu kỳ', type:'text', required:true, value: existing?.cycle || todayQuarter, placeholder:'vd Q3-2026', hint:'Định danh chu kỳ (quý-năm) để xếp lịch năm.'},
      {key:'plannedDate', label:'Ngày dự kiến', type:'date', required:true, value: existing?.plannedDate || deployTodayIso()},
      {key:'executedDate', label:'Ngày thực hiện thực tế', type:'date', value: existing?.executedDate || '', hint:'Bỏ trống nếu chưa thực hiện.'},
      {key:'leadAuditor', label:'Đánh giá viên dẫn', type:'text', required:true, value: existing?.leadAuditor || (DeployState.me.name || DeployState.me.username || ''), placeholder:'Họ tên'},
      {key:'scope', label:'Phạm vi điều khoản ISO 9001', type:'multiselect', required:true,
        value: existing?.scope || ['4','5','6'],
        options: clauseSections.map(s => ({value: s, label: sectionLabels[s]}))},
      {key:'scopeDepts', label:'Phòng ban trong phạm vi', type:'multiselect', required:true,
        value: existing?.scopeDepts || ['QA'],
        options: DEPLOY_CONFIG.departments.map(d => ({value: d.id, label: d.label}))},
      {key:'status', label:'Trạng thái', type:'select', value: existing?.status || 'scheduled',
        options: [
          {value:'scheduled', label:'Đã lên lịch'},
          {value:'in_progress', label:'Đang thực hiện'},
          {value:'completed', label:'Hoàn tất'},
          {value:'closed', label:'Đã đóng'},
        ]},
    ],
    onSubmit: (v) => deploySaveAudit({...(existing||{}), ...v}),
  });
}
async function deploySaveAudit(payload){
  try{
    const res = await deployApi('deploy_audit_save', payload);
    DeployState.audits = res.data;
    renderDeployDashboard();
  }catch(e){ console.error('[deploy] audit failed', e); alert('Lỗi lưu audit: ' + e.message); }
}

function deployOpenFindingForm(auditId, existing){
  const isEdit = !!(existing && existing.id);
  const clauseOptions = ((DeployState.clauses && DeployState.clauses.clauses) || []).map(c => ({
    value: c.code, label: `${c.code} — ${c.title}`
  }));
  deployOpenFormDialog({
    kicker: isEdit ? `Sửa phát hiện ${existing.id}` : `Ghi phát hiện mới · ${auditId}`,
    title: isEdit ? 'Cập nhật phát hiện đánh giá' : 'Ghi phát hiện đánh giá nội bộ',
    accentColor: '#dc2626',
    submitLabel: isEdit ? 'Cập nhật' : 'Ghi phát hiện',
    fields: [
      {key:'clauseRef', label:'Điều khoản ISO 9001 vi phạm', type:'select', required:true,
        value: existing?.clauseRef || '',
        options: [{value:'', label:'— Chọn điều khoản —'}, ...clauseOptions]},
      {key:'severity', label:'Mức độ', type:'select', required:true, value: existing?.severity || 'minor',
        options: [
          {value:'major', label:'Major — Sự không phù hợp nặng'},
          {value:'minor', label:'Minor — Sự không phù hợp nhẹ'},
          {value:'observation', label:'Observation — Quan sát'},
          {value:'opportunity', label:'Opportunity — Cơ hội cải tiến'},
        ]},
      {key:'deptId', label:'Phòng ban liên quan', type:'select', required:true,
        value: existing?.deptId || 'QA',
        options: DEPLOY_CONFIG.departments.map(d => ({value:d.id, label: d.label}))},
      {key:'description', label:'Mô tả phát hiện', type:'textarea', required:true, rows:3, value: existing?.description || '',
        placeholder:'Ghi rõ điểm không phù hợp + tham chiếu hoạt động/quá trình'},
      {key:'evidence', label:'Bằng chứng', type:'textarea', rows:2, value: existing?.evidence || '',
        placeholder:'Tài liệu, hồ sơ, quan sát, phỏng vấn — kèm mã/đường dẫn nếu có', hint:'Bằng chứng cụ thể giúp khi tái kiểm tra.'},
      {key:'status', label:'Trạng thái', type:'select', value: existing?.status || 'open',
        options: [
          {value:'open', label:'Mở'},
          {value:'capa', label:'Đã chuyển CAPA'},
          {value:'closed', label:'Đã đóng'},
        ]},
      {key:'capaLink', label:'Link CAPA (nếu có)', type:'text', value: existing?.capaLink || '',
        placeholder:'/portal.html#eqms?capa=CAPA-...', hint:'Để trống nếu chưa mở CAPA.'},
    ],
    onSubmit: (v) => deploySaveFinding({auditId, findingId: existing?.id || '', ...v}),
  });
}
async function deploySaveFinding(payload){
  try{
    const res = await deployApi('deploy_audit_finding_save', payload);
    DeployState.audits = res.data;
    renderDeployDashboard();
  }catch(e){ console.error('[deploy] finding failed', e); alert('Lỗi lưu finding: ' + e.message); }
}

function deployOpenReviewForm(existing){
  const isEdit = !!(existing && existing.id);
  const inputTpl = (DeployState.reviews && DeployState.reviews.inputTemplate) || [];
  const outputTpl = (DeployState.reviews && DeployState.reviews.outputTemplate) || [];
  const todayQuarter = 'Q' + (Math.floor(new Date().getMonth()/3)+1) + '-' + new Date().getFullYear();
  const existingInputs  = (existing && existing.inputs)  || {};
  const existingOutputs = (existing && existing.outputs) || {};

  const fields = [
    {key:'cycle', label:'Chu kỳ Review', type:'text', required:true,
      value: existing?.cycle || todayQuarter, placeholder:'vd Q3-2026',
      hint:'Theo điều khoản 9.3.1 — định kỳ tối thiểu 1 năm; khuyến nghị quý.'},
    {key:'date', label:'Ngày họp Review', type:'date', required:true,
      value: existing?.date || deployTodayIso()},
    {key:'attendees_raw', label:'Người tham dự', type:'text',
      value: (existing?.attendees || [DeployState.me.name || '']).filter(Boolean).join(', '),
      placeholder:'Họ tên, phân cách dấu phẩy',
      hint:'CEO + ban điều hành tối thiểu — clause 9.3.1.'},

    {type:'separator', label:'📋 Đầu vào (Clause 9.3.2) — 12 mục bắt buộc'},
    ...inputTpl.map(it => ({
      key: 'input_' + it.key,
      label: `${it.clause} · ${it.label}`,
      type: 'textarea', rows: 2,
      value: existingInputs[it.key] || '',
      placeholder:'Ghi tình trạng + nguồn dữ liệu',
    })),

    {type:'separator', label:'🎯 Đầu ra (Clause 9.3.3) — 3 nhóm quyết định'},
    ...outputTpl.map(it => ({
      key: 'output_' + it.key,
      label: `${it.clause} · ${it.label}`,
      type: 'textarea', rows: 2,
      value: existingOutputs[it.key] || '',
      placeholder:'Quyết định + người chịu trách nhiệm + hạn',
    })),
  ];

  deployOpenFormDialog({
    kicker: isEdit ? 'Cập nhật Management Review' : 'Tạo Management Review mới',
    title: isEdit ? `Cập nhật packet ${existing.cycle}` : 'Xem xét lãnh đạo — packet quý mới',
    description: 'Theo điều khoản ISO 9001 §9.3 — Xem xét của lãnh đạo. Điền đầu vào + đầu ra, lưu rồi ký khóa.',
    accentColor: '#7c3aed',
    submitLabel: isEdit ? 'Cập nhật' : 'Tạo packet',
    fields,
    hint: 'Ô để trống = chưa có dữ liệu. Có thể quay lại sửa.',
    onSubmit: (v) => {
      const attendees = (v.attendees_raw || '').split(',').map(s => s.trim()).filter(Boolean);
      const inputs = {};
      inputTpl.forEach(it => { inputs[it.key] = v['input_'+it.key] || ''; });
      const outputs = {};
      outputTpl.forEach(it => { outputs[it.key] = v['output_'+it.key] || ''; });
      return deploySaveReview({
        ...(existing||{}),
        cycle: v.cycle,
        date: v.date,
        attendees, inputs, outputs,
      });
    },
  });
}

function deployEditReview(id){
  const list = (DeployState.reviews && DeployState.reviews.reviews) || [];
  const r = list.find(x => x.id === id);
  if (!r) return;
  deployOpenReviewForm(r);
}

async function deploySaveReview(payload){
  try{
    const res = await deployApi('deploy_review_save', payload);
    DeployState.reviews = res.data;
    renderDeployDashboard();
  }catch(e){ console.error('[deploy] review failed', e); alert('Lỗi lưu review: ' + e.message); }
}

async function deploySignOffReview(id){
  if (!DeployState.me.canSignOff) { alert('Cần quyền CEO/QMS Manager.'); return; }
  if (!confirm('Khóa Management Review packet này?')) return;
  try{
    const res = await deployApi('deploy_review_signoff', {id});
    DeployState.reviews = res.data;
    renderDeployDashboard();
  }catch(e){ console.error('[deploy] review signoff failed', e); alert('Lỗi: ' + e.message); }
}

async function deployBridgeCapa(issueId){
  if (!confirm('Mở CAPA case từ issue này? Issue sẽ chuyển trạng thái workaround.')) return;
  try{
    const res = await deployApi('deploy_capa_bridge', {issueId});
    DeployState.issues = res.data;
    renderDeployDashboard();
    if (res.capaLink) window.open(res.capaLink, '_blank');
  }catch(e){ console.error('[deploy] capa bridge failed', e); alert('Lỗi mở CAPA: ' + e.message); }
}

// Password gate cho Reset state. Mật khẩu chốt ở client để tránh người dùng
// nhấn nhầm khi đang demo — không phải bí mật bảo mật cao. Backend vẫn
// kiểm tra confirm token "RESET_DEPLOY_STATE" như cũ, nên giả mạo client
// vẫn không qua được API.
const DEPLOY_RESET_PASSWORD = '122112';

function deployResetState(){
  deployOpenFormDialog({
    title: 'Reset state triển khai',
    kicker: '⚠ Hành động không thể hoàn tác',
    accentColor: '#dc2626',
    submitLabel: '🗑 Xác nhận reset',
    hint: 'Xóa: readiness, champion roster, issue, drill, audit, biên bản review. Không xóa: program.json (12 tuần), iso-clauses.json, meetings template.',
    fields: [
      {
        type: 'static',
        label: 'Ảnh hưởng',
        value: 'Toàn bộ tiến độ phòng ban, danh sách champion, sổ vấn đề, biên bản họp tuần, đánh giá nội bộ, xem xét lãnh đạo sẽ bị xóa.',
      },
      {
        type: 'password',
        key: 'password',
        label: 'Mật khẩu xác nhận',
        required: true,
        maxLength: 12,
        placeholder: '••••••',
        hint: 'Hỏi QMS Manager nếu chưa biết mật khẩu reset. Hành động được audit log.',
      },
    ],
    onSubmit: async (values) => {
      const pwd = (values.password || '').trim();
      if (pwd !== DEPLOY_RESET_PASSWORD) {
        alert('Mật khẩu sai. Hủy reset.');
        return;
      }
      await deployResetStateConfirmed();
    },
  });
}

async function deployResetStateConfirmed(){
  try{
    await deployApi('deploy_state_reset', {confirm: 'RESET_DEPLOY_STATE'});
    await loadDeployState();
    renderDeployDashboard();
  }catch(e){ console.error('[deploy] reset failed', e); alert('Lỗi reset: ' + e.message); }
}

// ── Main render ───────────────────────────────────────────────────────────
function renderDeployDashboard(){
  const container = document.getElementById('page-deploy');
  if (!container) return;
  if (!DeployState.loaded) {
    container.innerHTML = `<div class="deploy-loading"><div class="deploy-spinner"></div><p>Đang nạp Command Center...</p></div>`;
    loadDeployState().then(() => renderDeployDashboard());
    return;
  }
  const at = DeployState.activeTab;
  const me = DeployState.me;
  let tabHtml = '';
  switch(at){
    case 'timeline':    tabHtml = renderTabTimeline(); break;
    case 'meetings':    tabHtml = renderTabMeetings(); break;
    case 'departments': tabHtml = renderTabDepartments(); break;
    case 'docs':        tabHtml = renderTabDocs(); break;
    case 'issues':      tabHtml = renderTabIssues(); break;
    case 'iso':         tabHtml = renderTabIso(); break;
    case 'audit':       tabHtml = renderTabAudit(); break;
    case 'review':      tabHtml = renderTabReview(); break;
    default:            tabHtml = renderTabOverview();
  }
  container.innerHTML = `
    <div class="deploy-dash">
      ${renderDeployHero()}
      ${renderDeploySummary()}
      <nav class="deploy-tabs" role="tablist">
        <button class="deploy-tab ${at==='overview'?'active':''}"    onclick="switchDeployTab('overview')">Tổng quan</button>
        <button class="deploy-tab ${at==='timeline'?'active':''}"    onclick="switchDeployTab('timeline')">Lộ trình</button>
        <button class="deploy-tab ${at==='meetings'?'active':''}"    onclick="switchDeployTab('meetings')">Họp &amp; Gate</button>
        <button class="deploy-tab ${at==='departments'?'active':''}" onclick="switchDeployTab('departments')">Phòng ban</button>
        <button class="deploy-tab ${at==='docs'?'active':''}"        onclick="switchDeployTab('docs')">Tài liệu</button>
        <button class="deploy-tab ${at==='issues'?'active':''}"      onclick="switchDeployTab('issues')">Vấn đề &amp; sự cố</button>
        <button class="deploy-tab ${at==='iso'?'active':''}"         onclick="switchDeployTab('iso')">Bản đồ ISO 9001</button>
        <button class="deploy-tab ${at==='audit'?'active':''}"       onclick="switchDeployTab('audit')">Đánh giá nội bộ (9.2)</button>
        <button class="deploy-tab ${at==='review'?'active':''}"      onclick="switchDeployTab('review')">Xem xét lãnh đạo (9.3)</button>
      </nav>
      ${tabHtml}
      <div class="deploy-footer">
        <span>${me.canEdit ? `Đăng nhập <strong>${deployEscape(me.name||me.username)}</strong> · ${deployEscape(me.role)}` : 'Chế độ chỉ đọc'} · cập nhật ${deployIsoToVi(DeployState.program?.lastUpdated)}</span>
        ${me.canSignOff ? `<button class="deploy-btn-reset" onclick="deployResetState()">Reset state</button>` : ''}
      </div>
      ${renderWeekPanel()}
      ${renderPickerModal()}
      ${renderFormDialog()}
    </div>`;
}

// Legacy global aliases (kept so the portal router and any cached HTML keep working)
window.renderDeployDashboard = renderDeployDashboard;
window.switchDeployTab = switchDeployTab;
window.deployCycleReadiness = deployCycleReadiness;
window.deployUpdateMetric = deployUpdateMetric;
window.deployToggleChecklist = deployToggleChecklist;
window.deploySetPhase = deploySetPhase;
window.deployOpenWeek = deployOpenWeek;
window.deployCloseWeek = deployCloseWeek;
window.deploySaveMeeting = deploySaveMeeting;
window.deploySignOffMeeting = deploySignOffMeeting;
window.deploySignOffWeek = deploySignOffWeek;
window.deploySaveChampion = deploySaveChampion;
window.deployOpenIssueForm = deployOpenIssueForm;
window.deployUpdateIssueStatus = deployUpdateIssueStatus;
window.deployRecordDrill = deployRecordDrill;
window.deployOpenAuditForm = deployOpenAuditForm;
window.deployOpenFindingForm = deployOpenFindingForm;
window.deployOpenReviewForm = deployOpenReviewForm;
window.deployEditReview = deployEditReview;
window.deploySignOffReview = deploySignOffReview;
window.deployBridgeCapa = deployBridgeCapa;
window.deployOpenPicker = deployOpenPicker;
window.deployClosePicker = deployClosePicker;
window.deployPickerSetQuery = deployPickerSetQuery;
window.deployPickerSetFilter = deployPickerSetFilter;
window.deployPickerSelect = deployPickerSelect;
window.deployPickerAssignManual = deployPickerAssignManual;
window.deployClearChampion = deployClearChampion;
window.deployCloseFormDialog = deployCloseFormDialog;
window.deployFormDialogSubmit = deployFormDialogSubmit;
window.deployEditIssue = deployEditIssue;
window.deployEditAudit = (id) => {
  const a = ((DeployState.audits && DeployState.audits.audits) || []).find(x => x.id === id);
  if (a) deployOpenAuditForm(a);
};
window.deployEditFinding = (auditId, findingId) => {
  const a = ((DeployState.audits && DeployState.audits.audits) || []).find(x => x.id === auditId);
  if (!a) return;
  const f = (a.findings || []).find(x => x.id === findingId);
  if (f) deployOpenFindingForm(auditId, f);
};
window.deployResetState = deployResetState;
