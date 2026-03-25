// ═══════════════════════════════════════════════════════════════════
// 08-deploy-dashboard.js — Operations Deployment Dashboard
// Triển khai vận hành Dashboard — HESEM QMS
// Design: Toyota SQPC + Lean Tier Board + ISO/AS9100 Readiness
// ═══════════════════════════════════════════════════════════════════

// ── DEPLOYMENT DATA MODEL ──
const DEPLOY_CONFIG = {
  phases: [
    {id:'P0',label:'Phase 0',title:'Chuẩn bị & Đồng bộ',titleEn:'Preparation & Sync',weeks:'T1–T4',color:'#64748b',icon:'⚙️'},
    {id:'P1',label:'Phase 1',title:'Đào tạo & Hạ tầng',titleEn:'Training & Infrastructure',weeks:'T5–T6',color:'#3b82f6',icon:'🎓'},
    {id:'P2',label:'Phase 2',title:'Pilot 3 nhóm Job',titleEn:'Pilot 3 Job Groups',weeks:'T7–T10',color:'#f59e0b',icon:'🧪'},
    {id:'P3',label:'Phase 3',title:'Go-Live đồng loạt',titleEn:'Company-wide Go-Live',weeks:'T11–T14',color:'#10b981',icon:'🚀'},
    {id:'P4',label:'Phase 4',title:'Ổn định & Chứng nhận',titleEn:'Stabilize & Certify',weeks:'T15–T20',color:'#8b5cf6',icon:'🏆'}
  ],
  departments: [
    {id:'PROD',label:'Sản xuất',labelEn:'Production',icon:'🏭',color:'#1e40af',wave:1,headcount:'15–30',champion:4},
    {id:'ENG', label:'Kỹ thuật',labelEn:'Engineering',icon:'⚡',color:'#9d174d',wave:1,headcount:'4–8',champion:2},
    {id:'QA',  label:'Chất lượng',labelEn:'Quality',icon:'✅',color:'#166534',wave:1,headcount:'4–8',champion:3},
    {id:'SCM', label:'Chuỗi cung ứng',labelEn:'Supply Chain',icon:'📦',color:'#92400e',wave:2,headcount:'3–6',champion:2},
    {id:'SALES',label:'Kinh doanh',labelEn:'Sales/CS',icon:'💼',color:'#3730a3',wave:2,headcount:'3–5',champion:1},
    {id:'FIN', label:'Tài chính',labelEn:'Finance',icon:'💰',color:'#6b21a8',wave:3,headcount:'2–4',champion:1},
    {id:'HR',  label:'Nhân sự',labelEn:'HR',icon:'👥',color:'#9f1239',wave:3,headcount:'1–2',champion:1},
    {id:'IT',  label:'IT / ERP',labelEn:'IT / ERP',icon:'💻',color:'#155e75',wave:3,headcount:'2–3',champion:1},
    {id:'EHS', label:'EHS',labelEn:'EHS',icon:'🛡️',color:'#b45309',wave:3,headcount:'1–2',champion:1},
    {id:'ERP', label:'Epicor',labelEn:'Epicor ERP',icon:'🔗',color:'#0f766e',wave:3,headcount:'1–2',champion:1}
  ],
  kpis: [
    {id:'KPI-FLD-01',label:'File routing đúng',target:'≥95%',unit:'%',category:'ops',icon:'📁'},
    {id:'KPI-FLD-02',label:'Retrieval time',target:'≤60s',unit:'s',category:'ops',icon:'⏱️'},
    {id:'KPI-PLAN-01',label:'OTD (ship date)',target:'≥92%',unit:'%',category:'delivery',icon:'📅'},
    {id:'KPI-PLAN-02',label:'WIP aging đỏ/đen',target:'≤5%',unit:'%',category:'delivery',icon:'📊'},
    {id:'KPI-FAI-01',label:'First-pass setup',target:'≥85%',unit:'%',category:'quality',icon:'🎯'},
    {id:'KPI-CERT-01',label:'Cert completeness',target:'100%',unit:'%',category:'quality',icon:'📜'},
    {id:'KPI-NCR-01',label:'Containment time',target:'≤2h',unit:'h',category:'quality',icon:'🚨'},
    {id:'KPI-NCR-02',label:'CAPA on-time',target:'≥90%',unit:'%',category:'quality',icon:'🔧'},
    {id:'KPI-PLAN-03',label:'Dispatch adherence',target:'≥90%',unit:'%',category:'delivery',icon:'📋'},
    {id:'KPI-SUP-01',label:'Supplier OTD',target:'≥95%',unit:'%',category:'supply',icon:'🚚'},
    {id:'KPI-DEPLOY-01',label:'Dept go-live',target:'100%',unit:'%',category:'deploy',icon:'🏢'}
  ],
  gates: [
    {id:'G0',label:'Contract Kickoff',owner:'Sales/CS',color:'#64748b'},
    {id:'G1',label:'Setup Release',owner:'Engineering',color:'#3b82f6'},
    {id:'G2',label:'First Piece / FAI',owner:'QA/QC',color:'#f59e0b'},
    {id:'G3',label:'IPQC Production',owner:'Production',color:'#10b981'},
    {id:'G4',label:'Final QC & Pack',owner:'QA + WHS',color:'#8b5cf6'},
    {id:'G5',label:'Ship Release',owner:'QA + Logistics',color:'#ef4444'}
  ]
};

// ── LOCAL STORAGE for deploy state ──
const DEPLOY_STORAGE_KEY = 'hesem_deploy_state';

function loadDeployState(){
  try {
    const s = localStorage.getItem(DEPLOY_STORAGE_KEY);
    if(s) return JSON.parse(s);
  } catch(e){}
  return getDefaultDeployState();
}

function saveDeployState(state){
  try { localStorage.setItem(DEPLOY_STORAGE_KEY, JSON.stringify(state)); } catch(e){}
}

function getDefaultDeployState(){
  const state = {
    currentPhase: 'P0',
    startDate: null,
    phaseStatus: {P0:'in_progress',P1:'pending',P2:'pending',P3:'pending',P4:'pending'},
    deptReadiness: {},
    kpiValues: {},
    checklistItems: {},
    notes: [],
    lastUpdated: new Date().toISOString()
  };
  DEPLOY_CONFIG.departments.forEach(d => {
    state.deptReadiness[d.id] = {
      docReview:'pending', training:'pending', m365:'pending',
      champion:'pending', pilot:'pending', golive:'pending'
    };
  });
  return state;
}

// ── RENDER MAIN DASHBOARD ──
function renderDeployDashboard(){
  const el = document.getElementById('page-deploy');
  const state = loadDeployState();
  const isVi = (typeof lang !== 'undefined' && lang === 'vi') || true;

  el.innerHTML = `
    <div class="deploy-dash">
      <!-- ═══ TOP: Phase Timeline ═══ -->
      <div class="deploy-section">
        <div class="deploy-phase-timeline">
          ${DEPLOY_CONFIG.phases.map(p => {
            const st = state.phaseStatus[p.id] || 'pending';
            const cls = st === 'completed' ? 'phase-done' : st === 'in_progress' ? 'phase-active' : 'phase-pending';
            return `<div class="phase-node ${cls}" onclick="setDeployPhase('${p.id}')" title="${p.title}">
              <div class="phase-icon">${p.icon}</div>
              <div class="phase-info">
                <strong>${p.label}</strong>
                <span>${p.title}</span>
                <span class="phase-weeks">${p.weeks}</span>
              </div>
              <div class="phase-status-dot"></div>
            </div>`;
          }).join('<div class="phase-connector"></div>')}
        </div>
      </div>

      <!-- ═══ ROW 1: SQPC Summary Cards (Toyota model) ═══ -->
      <div class="deploy-section">
        <h2 class="deploy-h2">📊 ${isVi?'Tổng quan SQPC':'SQPC Overview'} <span class="deploy-subtitle">(Safety – Quality – Productivity – Cost)</span></h2>
        <div class="sqpc-grid">
          <div class="sqpc-card sqpc-safety">
            <div class="sqpc-icon">🛡️</div>
            <div class="sqpc-label">Safety</div>
            <div class="sqpc-value" id="sqpc-safety">0</div>
            <div class="sqpc-target">${isVi?'Sự cố':'Incidents'}</div>
            <input type="number" min="0" class="sqpc-input" id="input-safety" value="${state.kpiValues['safety']||0}" onchange="updateSqpc('safety',this.value)">
          </div>
          <div class="sqpc-card sqpc-quality">
            <div class="sqpc-icon">✅</div>
            <div class="sqpc-label">Quality</div>
            <div class="sqpc-value" id="sqpc-quality">${state.kpiValues['quality']||'—'}</div>
            <div class="sqpc-target">FPY %</div>
            <input type="number" min="0" max="100" class="sqpc-input" id="input-quality" value="${state.kpiValues['quality']||''}" onchange="updateSqpc('quality',this.value)" placeholder="FPY %">
          </div>
          <div class="sqpc-card sqpc-productivity">
            <div class="sqpc-icon">⚡</div>
            <div class="sqpc-label">Productivity</div>
            <div class="sqpc-value" id="sqpc-productivity">${state.kpiValues['productivity']||'—'}</div>
            <div class="sqpc-target">OTD %</div>
            <input type="number" min="0" max="100" class="sqpc-input" id="input-productivity" value="${state.kpiValues['productivity']||''}" onchange="updateSqpc('productivity',this.value)" placeholder="OTD %">
          </div>
          <div class="sqpc-card sqpc-cost">
            <div class="sqpc-icon">💰</div>
            <div class="sqpc-label">Cost</div>
            <div class="sqpc-value" id="sqpc-cost">${state.kpiValues['cost']||'—'}</div>
            <div class="sqpc-target">${isVi?'Scrap/Rework %':'Scrap/Rework %'}</div>
            <input type="number" min="0" max="100" step="0.1" class="sqpc-input" id="input-cost" value="${state.kpiValues['cost']||''}" onchange="updateSqpc('cost',this.value)" placeholder="%">
          </div>
        </div>
      </div>

      <!-- ═══ ROW 2: Department Readiness Heatmap ═══ -->
      <div class="deploy-section">
        <h2 class="deploy-h2">🏢 ${isVi?'Mức sẵn sàng phòng ban':'Department Readiness'} <span class="deploy-subtitle">${isVi?'Nhấn ô để cập nhật trạng thái':'Click cell to update status'}</span></h2>
        <div class="deploy-table-wrap">
          <table class="deploy-heatmap">
            <thead>
              <tr>
                <th>${isVi?'Phòng ban':'Department'}</th>
                <th>Đợt</th>
                <th title="Cross-review tài liệu">📋 Doc Review</th>
                <th title="Đào tạo hoàn thành">🎓 Training</th>
                <th title="M365 cấu hình">☁️ M365</th>
                <th title="Champion chỉ định">🏅 Champion</th>
                <th title="Pilot hoàn thành">🧪 Pilot</th>
                <th title="Go-live">🚀 Go-Live</th>
              </tr>
            </thead>
            <tbody>
              ${DEPLOY_CONFIG.departments.map(d => {
                const dr = state.deptReadiness[d.id] || {};
                return `<tr>
                  <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${d.color};margin-right:6px"></span>${d.icon} ${d.label}</td>
                  <td style="text-align:center"><span class="deploy-wave-badge wave-${d.wave}">${isVi?'Đợt':'Wave'} ${d.wave}</span></td>
                  ${['docReview','training','m365','champion','pilot','golive'].map(dim => {
                    const val = dr[dim] || 'pending';
                    return `<td class="heatmap-cell hm-${val}" onclick="cycleReadiness('${d.id}','${dim}')" title="${d.label} — ${dim}: ${val}">${getStatusIcon(val)}</td>`;
                  }).join('')}
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div class="heatmap-legend">
          <span class="hm-legend-item"><span class="hm-dot hm-pending"></span> ${isVi?'Chưa bắt đầu':'Not Started'}</span>
          <span class="hm-legend-item"><span class="hm-dot hm-in_progress"></span> ${isVi?'Đang thực hiện':'In Progress'}</span>
          <span class="hm-legend-item"><span class="hm-dot hm-completed"></span> ${isVi?'Hoàn thành':'Completed'}</span>
          <span class="hm-legend-item"><span class="hm-dot hm-blocked"></span> ${isVi?'Bị chặn':'Blocked'}</span>
        </div>
      </div>

      <!-- ═══ ROW 3: Gate Flow & KPI Panel (side by side) ═══ -->
      <div class="deploy-row-2col">
        <!-- Gate Flow -->
        <div class="deploy-section">
          <h2 class="deploy-h2">🚦 ${isVi?'Cổng kiểm soát Job Order':'Job Order Control Gates'}</h2>
          <div class="gate-flow">
            ${DEPLOY_CONFIG.gates.map((g,i) => `
              <div class="gate-node" style="border-left-color:${g.color}">
                <div class="gate-id" style="background:${g.color}">${g.id}</div>
                <div class="gate-detail">
                  <strong>${g.label}</strong>
                  <span>${g.owner}</span>
                </div>
              </div>
              ${i < DEPLOY_CONFIG.gates.length-1 ? '<div class="gate-arrow">→</div>' : ''}
            `).join('')}
          </div>
          <div class="deploy-links-compact">
            <a href="../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-106-job-order-deployment-master-plan.html" target="_blank">📄 WI-106 Master Plan</a>
            <a href="../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-119-change-roadmap-and-priority-register.html" target="_blank">📄 ANNEX-119 Roadmap</a>
          </div>
        </div>

        <!-- KPI Cards -->
        <div class="deploy-section">
          <h2 class="deploy-h2">📈 ${isVi?'KPI vận hành':'Operational KPIs'}</h2>
          <div class="kpi-mini-grid">
            ${DEPLOY_CONFIG.kpis.slice(0,8).map(k => {
              const val = state.kpiValues[k.id] || '';
              const rag = getKpiRag(k, val);
              return `<div class="kpi-mini-card kpi-rag-${rag}">
                <div class="kpi-mini-icon">${k.icon}</div>
                <div class="kpi-mini-body">
                  <div class="kpi-mini-label">${k.label}</div>
                  <div class="kpi-mini-target">${isVi?'Mục tiêu':'Target'}: ${k.target}</div>
                </div>
                <input type="text" class="kpi-mini-input" value="${val}" placeholder="—" onchange="updateKpi('${k.id}',this.value)">
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- ═══ ROW 4: Go/No-Go Checklists ═══ -->
      <div class="deploy-section">
        <h2 class="deploy-h2">☑️ ${isVi?'Go/No-Go Checklist':'Go/No-Go Checklist'} — ${getActivePhaseLabel(state)}</h2>
        <div class="checklist-grid">
          ${getPhaseChecklist(state.currentPhase).map((item,i) => {
            const key = state.currentPhase + '-' + i;
            const checked = state.checklistItems[key] || false;
            return `<label class="checklist-item ${checked?'checked':''}">
              <input type="checkbox" ${checked?'checked':''} onchange="toggleChecklist('${key}',this.checked)">
              <span class="checklist-code">${item.code}</span>
              <span class="checklist-text">${item.text}</span>
            </label>`;
          }).join('')}
        </div>
      </div>

      <!-- ═══ ROW 5: Tier Meeting Quick Board ═══ -->
      <div class="deploy-section">
        <h2 class="deploy-h2">📋 ${isVi?'Bảng quản lý hàng ngày (Tier Board)':'Daily Management Board (Tier Board)'}</h2>
        <div class="tier-board-grid">
          <div class="tier-col tier-safety">
            <div class="tier-header">🛡️ Safety</div>
            <div class="tier-body">
              <div class="tier-metric">${isVi?'Ngày không sự cố':'Days without incident'}</div>
              <input type="number" min="0" class="tier-input" value="${state.kpiValues['safeDays']||0}" onchange="updateSqpc('safeDays',this.value)">
            </div>
          </div>
          <div class="tier-col tier-quality-col">
            <div class="tier-header">✅ Quality</div>
            <div class="tier-body">
              <div class="tier-metric">NCR ${isVi?'mở':'open'}: <input type="number" min="0" class="tier-input-sm" value="${state.kpiValues['ncrOpen']||0}" onchange="updateSqpc('ncrOpen',this.value)"></div>
              <div class="tier-metric">CAPA ${isVi?'quá hạn':'overdue'}: <input type="number" min="0" class="tier-input-sm" value="${state.kpiValues['capaOverdue']||0}" onchange="updateSqpc('capaOverdue',this.value)"></div>
            </div>
          </div>
          <div class="tier-col tier-delivery-col">
            <div class="tier-header">📅 Delivery</div>
            <div class="tier-body">
              <div class="tier-metric">${isVi?'Job trễ hôm nay':'Late jobs today'}: <input type="number" min="0" class="tier-input-sm" value="${state.kpiValues['lateJobs']||0}" onchange="updateSqpc('lateJobs',this.value)"></div>
              <div class="tier-metric">WIP aging ${isVi?'đỏ':'red'}: <input type="number" min="0" class="tier-input-sm" value="${state.kpiValues['wipRed']||0}" onchange="updateSqpc('wipRed',this.value)"></div>
            </div>
          </div>
          <div class="tier-col tier-people-col">
            <div class="tier-header">👥 People</div>
            <div class="tier-body">
              <div class="tier-metric">${isVi?'Đào tạo hoàn thành':'Training complete'}: <input type="number" min="0" max="100" class="tier-input-sm" value="${state.kpiValues['trainPct']||0}" onchange="updateSqpc('trainPct',this.value)">%</div>
              <div class="tier-metric">Champion ${isVi?'đạt':'pass'}: <input type="number" min="0" class="tier-input-sm" value="${state.kpiValues['champPass']||0}" onchange="updateSqpc('champPass',this.value)"> / 20</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ ROW 6: Quick Links & Documents ═══ -->
      <div class="deploy-section">
        <h2 class="deploy-h2">📚 ${isVi?'Tài liệu triển khai':'Deployment Documents'}</h2>
        <div class="deploy-doc-grid">
          ${[
            {icon:'📋',code:'WI-106',title:'Deployment Master Plan',path:'../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-106-job-order-deployment-master-plan.html'},
            {icon:'🗺️',code:'ANNEX-119',title:'Change Roadmap & Priority',path:'../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-119-change-roadmap-and-priority-register.html'},
            {icon:'🎓',code:'WI-103',title:'M365 Folder Routing Training',path:'../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-103-m365-folder-routing-training-competence-and-adoption-for-cnc-job-orders.html'},
            {icon:'🃏',code:'WI-104',title:'Quick Cards by Role',path:'../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-104-m365-folder-routing-quick-cards-by-role-for-cnc-job-order.html'},
            {icon:'🧭',code:'WI-105',title:'QMS Navigation & Deployment',path:'../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-105-qms-document-navigation-role-based-reading-path-and-deployment.html'},
            {icon:'🚀',code:'ANNEX-114',title:'Go-Live Runbook',path:'../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-114-go-live-runbook-and-cutover-control.html'},
            {icon:'📊',code:'ANNEX-117',title:'Escalation Matrix & SLA',path:'../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-117-escalation-matrix-and-sla.html'},
            {icon:'🔌',code:'ANNEX-118',title:'Offline Fallback Kit',path:'../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-118-offline-fallback-kit.html'},
            {icon:'🎯',code:'DRL-E2E',title:'Job Order End-to-End Drill',path:'../10-Training-Academy/02-Training-Content/03-Practice-Drills/drill-joborder-e2e.html'},
            {icon:'📈',code:'Role Maps',title:'30/60/90 Day Roadmaps',path:'../10-Training-Academy/04-Templates-Tools/role-roadmaps.html'}
          ].map(d => `<a class="deploy-doc-card" href="${d.path}" target="_blank">
            <span class="deploy-doc-icon">${d.icon}</span>
            <span class="deploy-doc-code">${d.code}</span>
            <span class="deploy-doc-title">${d.title}</span>
          </a>`).join('')}
        </div>
      </div>

      <!-- Footer -->
      <div class="deploy-footer">
        <span>${isVi?'Cập nhật lần cuối':'Last updated'}: ${state.lastUpdated ? new Date(state.lastUpdated).toLocaleString('vi-VN') : '—'}</span>
        <button class="deploy-btn-reset" onclick="if(confirm('${isVi?'Reset toàn bộ dữ liệu triển khai?':'Reset all deployment data?'}')){localStorage.removeItem('${DEPLOY_STORAGE_KEY}');renderDeployDashboard();}">🔄 Reset</button>
      </div>
    </div>
  `;
}

// ── HELPER FUNCTIONS ──
function getStatusIcon(status){
  switch(status){
    case 'completed': return '✅';
    case 'in_progress': return '🔵';
    case 'blocked': return '🔴';
    default: return '⬜';
  }
}

function cycleReadiness(deptId, dim){
  const state = loadDeployState();
  if(!state.deptReadiness[deptId]) state.deptReadiness[deptId] = {};
  const current = state.deptReadiness[deptId][dim] || 'pending';
  const cycle = ['pending','in_progress','completed','blocked'];
  const next = cycle[(cycle.indexOf(current)+1) % cycle.length];
  state.deptReadiness[deptId][dim] = next;
  state.lastUpdated = new Date().toISOString();
  saveDeployState(state);
  renderDeployDashboard();
}

function setDeployPhase(phaseId){
  const state = loadDeployState();
  const phases = DEPLOY_CONFIG.phases.map(p=>p.id);
  const idx = phases.indexOf(phaseId);
  phases.forEach((p,i) => {
    if(i < idx) state.phaseStatus[p] = 'completed';
    else if(i === idx) state.phaseStatus[p] = 'in_progress';
    else state.phaseStatus[p] = 'pending';
  });
  state.currentPhase = phaseId;
  state.lastUpdated = new Date().toISOString();
  saveDeployState(state);
  renderDeployDashboard();
}

function updateSqpc(key, val){
  const state = loadDeployState();
  state.kpiValues[key] = val;
  state.lastUpdated = new Date().toISOString();
  saveDeployState(state);
}

function updateKpi(kpiId, val){
  const state = loadDeployState();
  state.kpiValues[kpiId] = val;
  state.lastUpdated = new Date().toISOString();
  saveDeployState(state);
  // Re-render just the KPI card color
  renderDeployDashboard();
}

function toggleChecklist(key, checked){
  const state = loadDeployState();
  state.checklistItems[key] = checked;
  state.lastUpdated = new Date().toISOString();
  saveDeployState(state);
}

function getKpiRag(kpi, val){
  if(!val || val === '') return 'none';
  const v = parseFloat(val);
  if(isNaN(v)) return 'none';
  // Simple RAG logic based on target
  if(kpi.target.includes('≥')){
    const t = parseFloat(kpi.target.replace(/[≥%sh]/g,''));
    if(v >= t) return 'green';
    if(v >= t * 0.85) return 'amber';
    return 'red';
  }
  if(kpi.target.includes('≤')){
    const t = parseFloat(kpi.target.replace(/[≤%sh]/g,''));
    if(v <= t) return 'green';
    if(v <= t * 1.5) return 'amber';
    return 'red';
  }
  if(kpi.target === '100%') return v >= 100 ? 'green' : v >= 90 ? 'amber' : 'red';
  return 'none';
}

function getActivePhaseLabel(state){
  const p = DEPLOY_CONFIG.phases.find(p => p.id === state.currentPhase);
  return p ? `${p.label} — ${p.title}` : '';
}

function getPhaseChecklist(phaseId){
  const checklists = {
    P0: [
      {code:'P0-01',text:'87 SOP/WI đã cross-review, 0 comment mở'},
      {code:'P0-02',text:'FRM-101 đầy đủ 596 tài liệu'},
      {code:'P0-03',text:'39 FRM-102 DCR có chữ ký'},
      {code:'P0-04',text:'M365 Job Dossier template tạo thành công'},
      {code:'P0-05',text:'20+ Champion được chỉ định'},
      {code:'P0-06',text:'KPI dashboard template sẵn sàng'}
    ],
    P1: [
      {code:'P1-01',text:'10 Trưởng phòng hoàn thành briefing (≥70% quiz)'},
      {code:'P1-02',text:'20+ Champion đạt 3 tiêu chí (quiz + routing + retrieval)'},
      {code:'P1-03',text:'M365 production-ready (permissions, metadata)'},
      {code:'P1-04',text:'KPI dashboard hoạt động với dữ liệu baseline'}
    ],
    P2: [
      {code:'P2-01',text:'7–10 jobs pilot hoàn thành'},
      {code:'P2-02',text:'6 KPI được đo, không có KPI đỏ'},
      {code:'P2-03',text:'Retrieval time ≤90s'},
      {code:'P2-04',text:'0 wrong-revision thoát gate'},
      {code:'P2-05',text:'Champion tự vận hành được'},
      {code:'P2-06',text:'Tất cả vấn đề pilot đã đóng hoặc có kế hoạch'}
    ],
    P3: [
      {code:'P3-01',text:'10/10 phòng ban đã go-live'},
      {code:'P3-02',text:'KPI-FLD-01 (file routing) ≥85%'},
      {code:'P3-03',text:'0 wrong-version thoát gate trong 2 tuần'},
      {code:'P3-04',text:'100% nhân viên đã đào tạo (điểm danh + quiz)'}
    ],
    P4: [
      {code:'CERT-01',text:'87 SOP/WI đã V1, FRM-101 đầy đủ'},
      {code:'CERT-02',text:'Audit nội bộ hoàn thành, CAPA đóng hoặc có kế hoạch'},
      {code:'CERT-03',text:'Management Review có báo cáo + chữ ký CEO'},
      {code:'CERT-04',text:'Hệ thống vận hành ≥3 tháng có bằng chứng'},
      {code:'CERT-05',text:'100% nhân viên có đào tạo và bằng chứng'},
      {code:'CERT-06',text:'KPI đạt ngưỡng (OTD ≥90%, FPY ≥95%, retrieval ≤60s)'}
    ]
  };
  return checklists[phaseId] || checklists.P0;
}
