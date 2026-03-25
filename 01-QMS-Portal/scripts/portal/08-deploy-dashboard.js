const DEPLOY_STORAGE_KEY='hesem_deploy_state';

const DEPLOY_CONFIG={
  championTarget:20,
  phases:[
    {id:'P0',label:'Phase 0',title:'Chuan bi va dong bo',weeks:'T1-T4',color:'#64748b'},
    {id:'P1',label:'Phase 1',title:'Dao tao va readiness',weeks:'T5-T6',color:'#2563eb'},
    {id:'P2',label:'Phase 2',title:'Pilot va validation',weeks:'T7-T10',color:'#d97706'},
    {id:'P3',label:'Phase 3',title:'Go-live theo wave',weeks:'T11-T14',color:'#16a34a'},
    {id:'P4',label:'Phase 4',title:'On dinh va handoff',weeks:'T15-T20',color:'#7c3aed'}
  ],
  readinessDimensions:[
    {id:'docReview',label:'Doc Review',help:'Playlist, handbook, QR, SOP/WI link'},
    {id:'training',label:'Training',help:'Manager briefing, role training, OJT'},
    {id:'m365',label:'Digital',help:'M365, metadata, access, routing'},
    {id:'champion',label:'Champion',help:'Champion va backup theo ca'},
    {id:'pilot',label:'Pilot',help:'Dual-run, retrieval, drill, validation'},
    {id:'golive',label:'Go-Live',help:'Go/No-Go, hypercare, handoff'}
  ],
  pillars:[
    {title:'Governance va gate',owner:'CEO / Steering Committee',deliverable:'Gate review, escalation, rollback authority',pass:'Quyet dinh Go/No-Go da khoa'},
    {title:'Tai lieu va playlist',owner:'QMS Manager',deliverable:'WI-105, WI-106, handbooks, SOP/WI, QR',pass:'Nguoi dung biet mo tai lieu nao truoc'},
    {title:'M365 va access',owner:'IT Manager',deliverable:'Metadata, permissions, folder routing, fallback',pass:'Truy xuat dung, dung quyen'},
    {title:'Training va champion',owner:'HR / Dept Managers',deliverable:'Briefing, bootcamp, OJT, skills matrix',pass:'Nguoi dung tu thao tac duoc'},
    {title:'Pilot va validation',owner:'Production / QA',deliverable:'Dual-run, retrieval, drill, issue closure',pass:'Pilot khong con KPI do'},
    {title:'Go-live va hypercare',owner:'Cutover Lead',deliverable:'Runbook, support rota, severity board',pass:'Wave go-live on dinh'},
    {title:'Dashboard va evidence',owner:'QMS / Data Owner',deliverable:'Owner, source, refresh, exception, document hub',pass:'So dashboard dang tin'}
  ],
  departments:[
    {id:'PROD',label:'San xuat',wave:1,color:'#1e40af',owner:'Production Director',handbook:'../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-production-handbook.html',docs:[{code:'SOP-501',path:'../03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-501-production-planning-scheduling-and-dispatch-control.html'},{code:'WI-519',path:'../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/05-WI-500/wi-519-job-packet-quick-check-and-pre-run-verification.html'}],record:'DEP-PRO + Job Dossier'},
    {id:'ENG',label:'Ky thuat',wave:1,color:'#9d174d',owner:'Engineering Manager',handbook:'../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-engineering-handbook.html',docs:[{code:'SOP-303',path:'../03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html'},{code:'WI-302',path:'../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/03-WI-300/wi-302-first-piece-fai-execution-and-evidence-pack.html'}],record:'Part master + Job Dossier + DEP-ENG'},
    {id:'QA',label:'Quality',wave:1,color:'#166534',owner:'QA Manager',handbook:'../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-quality-handbook.html',docs:[{code:'SOP-605',path:'../03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html'},{code:'WI-201',path:'../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-201-quality-gates-hold-points-and-release-execution.html'}],record:'Quality records + Job Dossier + DEP-QA'},
    {id:'SCM',label:'Chuoi cung ung',wave:2,color:'#92400e',owner:'SCM Manager',handbook:'../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-supply-chain-handbook.html',docs:[{code:'SOP-401',path:'../03-Tai-Lieu-Van-Hanh/01-SOPs/04-SOP-400/sop-401-supplier-control-and-special-process.html'},{code:'WI-701',path:'../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/07-WI-700/wi-701-receiving-iqc-traceability-and-put-away.html'}],record:'DEP-SCM + receiving/shipping pack'},
    {id:'SALES',label:'Kinh doanh / CS',wave:2,color:'#3730a3',owner:'Sales Manager',handbook:'../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-sales-and-customer-service-handbook.html',docs:[{code:'SOP-201',path:'../03-Tai-Lieu-Van-Hanh/01-SOPs/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html'},{code:'WI-203',path:'../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-203-job-dossier-evidence-pack-and-record-completeness.html'}],record:'DEP-SAL + customer records'},
    {id:'FIN',label:'Tai chinh',wave:3,color:'#6b21a8',owner:'Finance Manager',handbook:'../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-finance-handbook.html',docs:[{code:'SOP-803',path:'../03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-803-invoicing-job-costing-and-arap.html'},{code:'WI-203',path:'../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-203-job-dossier-evidence-pack-and-record-completeness.html'}],record:'DEP-FIN + ERP SoR'},
    {id:'HR',label:'Nhan su',wave:3,color:'#9f1239',owner:'HR Manager',handbook:'../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-hr-handbook.html',docs:[{code:'SOP-801',path:'../03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-801-competence-training-and-certification.html'},{code:'WI-103',path:'../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-103-m365-folder-routing-training-competence-and-adoption-for-cnc-job-orders.html'}],record:'Training records + restricted people site'},
    {id:'IT',label:'IT',wave:3,color:'#155e75',owner:'IT Manager',handbook:'../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-it-handbook.html',docs:[{code:'ANNEX-113',path:'../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-113-dashboard-deployment-access-and-refresh-control.html'},{code:'WI-102',path:'../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-102-sharepoint-record-sites-libraries-and-permissions-click-by-click.html'}],record:'Digital control site + access logs'},
    {id:'EHS',label:'EHS',wave:3,color:'#b45309',owner:'EHS Manager',handbook:'../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-ehs-handbook.html',docs:[{code:'SOP-802',path:'../03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-802-incident-near-miss-and-ehs.html'},{code:'ANNEX-703',path:'../03-Tai-Lieu-Van-Hanh/03-Reference/07-ANNEX-700/annex-703-warehouse-location-fifo-rules.html'}],record:'DEP-EHS + incident records'},
    {id:'ERP',label:'Epicor / ERP',wave:3,color:'#0f766e',owner:'ERP Owner',handbook:'../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-epicor-handbook.html',docs:[{code:'ANNEX-115',path:'../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-115-epicor-transaction-and-interface-map.html'},{code:'ANNEX-118',path:'../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-118-offline-fallback-kit.html'}],record:'Epicor SoR + interface logs'}
  ],
  docsByGroup:[
    {title:'Dieu phoi tong',subtitle:'Cho sponsor, steering va cutover lead',items:[{code:'WI-106',title:'Master plan',path:'../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-106-job-order-deployment-master-plan.html'},{code:'ANNEX-114',title:'Runbook go-live',path:'../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-114-go-live-runbook-and-cutover-control.html'},{code:'ANNEX-119',title:'Roadmap register',path:'../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-119-change-roadmap-and-priority-register.html'},{code:'ANNEX-117',title:'Escalation matrix',path:'../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-117-escalation-matrix-and-sla.html'}]},
    {title:'Tiep can va dao tao',subtitle:'Cho manager, champion va nguoi dung cuoi',items:[{code:'WI-105',title:'Document navigation',path:'../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-105-qms-document-navigation-role-based-reading-path-and-deployment.html'},{code:'WI-103',title:'Folder routing training',path:'../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-103-m365-folder-routing-training-competence-and-adoption-for-cnc-job-orders.html'},{code:'WI-104',title:'Quick cards',path:'../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-104-m365-folder-routing-quick-cards-by-role-for-cnc-job-order.html'},{code:'DRL-E2E',title:'Job Order drill',path:'../10-Training-Academy/02-Training-Content/03-Practice-Drills/drill-joborder-e2e.html'}]},
    {title:'Dashboard va du lieu',subtitle:'Cho owner, IT va data governance',items:[{code:'ANNEX-113',title:'Dashboard governance',path:'../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-113-dashboard-deployment-access-and-refresh-control.html'},{code:'ANNEX-110',title:'KPI dictionary',path:'../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-110-dashboard-kpi-dictionary-and-data-model.html'},{code:'WI-202',title:'Tier meetings',path:'../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-202-daily-management-tier-meetings-kpi-and-escalation.html'},{code:'WI-901',title:'Performance dashboard',path:'../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/09-WI-900/wi-901-performance-dashboard.html'}]},
    {title:'Fallback va bang chung',subtitle:'Cho hypercare, audit va handoff',items:[{code:'ANNEX-118',title:'Offline fallback kit',path:'../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-118-offline-fallback-kit.html'},{code:'WI-203',title:'Evidence pack',path:'../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-203-job-dossier-evidence-pack-and-record-completeness.html'},{code:'WI-201',title:'Quality gates',path:'../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-201-quality-gates-hold-points-and-release-execution.html'},{code:'ANNEX-135',title:'Records file plan',path:'../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-135-m365-operational-records-file-plan-by-department-role-and-job.html'}]}
  ],
  commandCadence:[
    {title:'Daily command center',owner:'Cutover Lead',cadence:'Hang ngay trong pilot / hypercare',purpose:'Review blocker, severity, issue aging'},
    {title:'Wave readiness review',owner:'Steering Committee',cadence:'Hang tuan',purpose:'Quyet pha, quyet wave, xu ly no-go'},
    {title:'Document and data review',owner:'QMS / IT',cadence:'Hang tuan',purpose:'Link, QR, refresh, owner, source'}
  ],
  kpis:[
    {id:'KPI-FLD-01',label:'Routing accuracy',target:'>=95%',icon:'RA'},
    {id:'KPI-FLD-02',label:'Document retrieval',target:'<=3',icon:'RT'},
    {id:'KPI-TRN-01',label:'Training completion',target:'>=90%',icon:'TR'},
    {id:'KPI-DEP-01',label:'Champion coverage',target:'>=100%',icon:'CH'},
    {id:'KPI-DEP-02',label:'Issue closure on time',target:'>=95%',icon:'IC'},
    {id:'KPI-DEP-03',label:'Change failure rate',target:'<=10%',icon:'CF'},
    {id:'KPI-DEP-04',label:'Change lead time',target:'<=10',icon:'LT'},
    {id:'KPI-DEP-05',label:'Dashboard refresh on time',target:'>=95%',icon:'RF'}
  ],
  phaseChecklists:{
    P0:[{code:'P0-01',text:'Handbook, SOP, WI, FRM, ANNEX va QR da dong bo'},{code:'P0-02',text:'Champion va backup theo ca da duoc chi dinh'},{code:'P0-03',text:'M365 metadata, permission, folder routing da test'},{code:'P0-04',text:'Dashboard shell da co owner, source, quick links'},{code:'P0-05',text:'Issue register va cadence dieu hanh da san sang'}],
    P1:[{code:'P1-01',text:'Manager briefing da hoan thanh'},{code:'P1-02',text:'Champion bootcamp da pass'},{code:'P1-03',text:'Nguoi dung trong wave da pass OJT'},{code:'P1-04',text:'Baseline KPI va dashboard readiness da duoc nap'}],
    P2:[{code:'P2-01',text:'Dual-run va single-run da xac nhan tren pilot'},{code:'P2-02',text:'Retrieval, traceback va wrong-revision drill da pass'},{code:'P2-03',text:'Issue pilot da dong hoac co action plan'},{code:'P2-04',text:'Phong ban core van hanh doc lap duoc'}],
    P3:[{code:'P3-01',text:'Wave hien tai co command center va support rota'},{code:'P3-02',text:'Go-live sign-off, fallback va rollback trigger da khoa'},{code:'P3-03',text:'KPI do khong co hoac da co exception note'},{code:'P3-04',text:'Nguoi dung mo dung tai lieu va luu dung ho so'}],
    P4:[{code:'P4-01',text:'Hypercare Sev-1 = 0 va Sev-2 co workaround on dinh'},{code:'P4-02',text:'Dashboard governance, access review va refresh SLA da khoa'},{code:'P4-03',text:'Tai lieu, QR va playlist da cap nhat theo bai hoc that'},{code:'P4-04',text:'Owner van hanh thuong xuyen da nhan handoff'}]
  }
};

function loadDeployState(){try{const raw=localStorage.getItem(DEPLOY_STORAGE_KEY);if(raw)return JSON.parse(raw);}catch(e){}return getDefaultDeployState();}
function saveDeployState(state){try{localStorage.setItem(DEPLOY_STORAGE_KEY,JSON.stringify(state));}catch(e){}}
function getDefaultDeployState(){
  const state={currentPhase:'P0',phaseStatus:{P0:'in_progress',P1:'pending',P2:'pending',P3:'pending',P4:'pending'},deptReadiness:{},kpiValues:{sev1Open:0,sev2Open:0,sev3Open:0,championPass:0},checklistItems:{},lastUpdated:new Date().toISOString()};
  DEPLOY_CONFIG.departments.forEach((dept)=>{state.deptReadiness[dept.id]={};DEPLOY_CONFIG.readinessDimensions.forEach((dim)=>{state.deptReadiness[dept.id][dim.id]='pending';});});
  return state;
}

function getNumberValue(value){const parsed=parseFloat(value);return Number.isFinite(parsed)?parsed:0;}
function getDeptProgress(state,deptId){const readiness=(state.deptReadiness||{})[deptId]||{};const total=DEPLOY_CONFIG.readinessDimensions.reduce((sum,dim)=>{const value=readiness[dim.id]||'pending';if(value==='completed')return sum+1;if(value==='in_progress')return sum+0.5;return sum;},0);return total/DEPLOY_CONFIG.readinessDimensions.length;}
function hasDeptBlocked(state,deptId){const readiness=(state.deptReadiness||{})[deptId]||{};return DEPLOY_CONFIG.readinessDimensions.some((dim)=>readiness[dim.id]==='blocked');}
function getPhaseChecklist(phaseId){return DEPLOY_CONFIG.phaseChecklists[phaseId]||DEPLOY_CONFIG.phaseChecklists.P0;}
function getChampionPercent(state){const passed=getNumberValue(state.kpiValues.championPass);return Math.min(100,Math.round((passed/DEPLOY_CONFIG.championTarget)*100));}
function getNextChecklistItem(state){const checklist=getPhaseChecklist(state.currentPhase);for(let i=0;i<checklist.length;i+=1){if(!state.checklistItems[state.currentPhase+'-'+i])return checklist[i].code;}return '';}
function getDeptNextAction(state,deptId){
  const readiness=(state.deptReadiness||{})[deptId]||{};
  if(hasDeptBlocked(state,deptId))return 'Can go blocker truoc khi qua gate';
  const labels={docReview:'Chot playlist, QR va tai lieu hieu luc',training:'Hoan thanh manager briefing, role training va OJT',m365:'Khoa metadata, permission va route ho so',champion:'Chi dinh Champion va backup theo ca',pilot:'Hoan tat pilot, retrieval va drill',golive:'Xac nhan Go/No-Go, hypercare va handoff'};
  for(let i=0;i<DEPLOY_CONFIG.readinessDimensions.length;i+=1){const id=DEPLOY_CONFIG.readinessDimensions[i].id;if(readiness[id]!=='completed')return labels[id];}
  return 'Duy tri readiness va chuan bi audit / handoff';
}
function getStatusIcon(status){if(status==='completed')return 'OK';if(status==='in_progress')return 'IP';if(status==='blocked')return 'BL';return 'NS';}
function getKpiRag(kpi,value){
  if(value===''||value===null||typeof value==='undefined')return 'none';
  const numeric=parseFloat(String(value).replace('%',''));
  if(!Number.isFinite(numeric))return 'none';
  if(kpi.target.startsWith('>=')){const target=parseFloat(kpi.target.replace('>=','').replace('%',''));if(numeric>=target)return 'green';if(numeric>=target*0.85)return 'amber';return 'red';}
  if(kpi.target.startsWith('<=')){const target=parseFloat(kpi.target.replace('<=','').replace('%',''));if(numeric<=target)return 'green';if(numeric<=target*1.25)return 'amber';return 'red';}
  return 'none';
}

function renderPhaseNode(state,phase){
  const status=state.phaseStatus[phase.id]||'pending';
  const cls=status==='completed'?'phase-done':status==='in_progress'?'phase-active':'phase-pending';
  return `<button class="phase-node ${cls}" onclick="setDeployPhase('${phase.id}')" title="${phase.title}"><div class="phase-info"><strong>${phase.label}</strong><span>${phase.title}</span><span class="phase-weeks">${phase.weeks}</span></div><div class="phase-status-dot"></div></button>`;
}
function renderWaveColumn(state,wave){
  const departments=DEPLOY_CONFIG.departments.filter((dept)=>dept.wave===wave);
  return `<div class="wave-card"><div class="wave-card-head"><strong>Wave ${wave}</strong><span>${departments.length} dept</span></div><div class="wave-card-body">${departments.map((dept)=>`<div class="wave-dept-row"><div class="wave-dept-main"><span class="wave-color" style="background:${dept.color}"></span><span>${dept.label}</span></div><span class="wave-score">${Math.round(getDeptProgress(state,dept.id)*100)}%</span></div>`).join('')}</div></div>`;
}
function renderDepartmentCard(state,dept){
  const progress=Math.round(getDeptProgress(state,dept.id)*100);
  const blocked=hasDeptBlocked(state,dept.id);
  return `<div class="dept-card ${blocked?'dept-card-blocked':''}"><div class="dept-card-head"><div><span class="dept-wave-badge wave-${dept.wave}">Wave ${dept.wave}</span><h3>${dept.label}</h3><div class="dept-owner">${dept.owner}</div></div><div class="dept-progress-ring"><strong>${progress}%</strong></div></div><div class="dept-progress-bar"><span style="width:${progress}%"></span></div><div class="dept-next-action">${getDeptNextAction(state,dept.id)}</div><div class="dept-link-group"><a href="${dept.handbook}" target="_blank">Handbook</a>${dept.docs.map((doc)=>`<a href="${doc.path}" target="_blank">${doc.code}</a>`).join('')}</div><div class="dept-records">${dept.record}</div></div>`;
}
function renderReadinessRow(state,dept){
  const readiness=state.deptReadiness[dept.id]||{};
  const progress=Math.round(getDeptProgress(state,dept.id)*100);
  return `<tr><td><div class="readiness-dept-name"><span class="wave-color" style="background:${dept.color}"></span><span>${dept.label}</span></div></td><td><span class="deploy-wave-badge wave-${dept.wave}">Wave ${dept.wave}</span></td>${DEPLOY_CONFIG.readinessDimensions.map((dim)=>{const value=readiness[dim.id]||'pending';return `<td class="heatmap-cell hm-${value}" onclick="cycleReadiness('${dept.id}','${dim.id}')" title="${dept.label} • ${dim.label} • ${value}">${getStatusIcon(value)}</td>`;}).join('')}<td><strong>${progress}%</strong></td></tr>`;
}
function renderKpiCard(state,kpi){
  const value=state.kpiValues[kpi.id]||'';
  const rag=getKpiRag(kpi,value);
  return `<div class="kpi-mini-card kpi-rag-${rag}"><div class="kpi-mini-icon">${kpi.icon}</div><div class="kpi-mini-body"><div class="kpi-mini-label">${kpi.label}</div><div class="kpi-mini-target">Target: ${kpi.target}</div></div><input type="text" class="kpi-mini-input" value="${value}" placeholder="-" onchange="updateMetric('${kpi.id}', this.value)"></div>`;
}

function renderDeployDashboard(){
  const container=document.getElementById('page-deploy');
  if(!container)return;
  const state=loadDeployState();
  const isVi=typeof lang==='undefined'?true:lang==='vi';
  const activePhase=DEPLOY_CONFIG.phases.find((phase)=>phase.id===state.currentPhase)||DEPLOY_CONFIG.phases[0];
  const readyDepartments=DEPLOY_CONFIG.departments.filter((dept)=>getDeptProgress(state,dept.id)>=1).length;
  const departmentsInProgress=DEPLOY_CONFIG.departments.filter((dept)=>{const progress=getDeptProgress(state,dept.id);return progress>0&&progress<1;}).length;
  const blockedDepartments=DEPLOY_CONFIG.departments.filter((dept)=>hasDeptBlocked(state,dept.id)).length;
  const redKpis=DEPLOY_CONFIG.kpis.filter((kpi)=>getKpiRag(kpi,state.kpiValues[kpi.id])==='red').length;
  const redSignals=blockedDepartments+redKpis+getNumberValue(state.kpiValues.sev1Open);
  const checklist=getPhaseChecklist(state.currentPhase);
  const checklistDone=checklist.filter((item,index)=>state.checklistItems[state.currentPhase+'-'+index]).length;

  container.innerHTML=`
    <div class="deploy-dash">
      <section class="deploy-hero">
        <div class="deploy-hero-main">
          <span class="deploy-kicker">${isVi?'Trien khai van hanh':'Operations deployment'}</span>
          <h1>${isVi?'Command Center trien khai van hanh va tiep can tai lieu':'Operations deployment command center'}</h1>
          <p>${isVi?'Dashboard nay dong thoi la bang dieu phoi cho lanh dao, bang readiness cho command center va document hub cho tung phong ban.':'This dashboard combines steering control, readiness tracking, and a document hub for every department.'}</p>
          <div class="deploy-hero-actions">
            <a class="deploy-action-link" href="../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-106-job-order-deployment-master-plan.html" target="_blank">WI-106</a>
            <a class="deploy-action-link" href="../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-105-qms-document-navigation-role-based-reading-path-and-deployment.html" target="_blank">WI-105</a>
            <a class="deploy-action-link" href="../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-114-go-live-runbook-and-cutover-control.html" target="_blank">ANNEX-114</a>
          </div>
        </div>
        <div class="deploy-hero-side">
          <div class="hero-side-card">
            <span class="hero-side-label">${isVi?'Pha hien tai':'Current phase'}</span>
            <strong>${activePhase.label}</strong>
            <div>${activePhase.title}</div>
            <div class="hero-side-meta">${activePhase.weeks}</div>
          </div>
          <div class="hero-side-card">
            <span class="hero-side-label">${isVi?'Checklist pha':'Phase checklist'}</span>
            <strong>${checklistDone}/${checklist.length}</strong>
            <div>${isVi?'Muc da xac nhan':'Items confirmed'}</div>
            <div class="hero-side-meta">${getNextChecklistItem(state)|| (isVi?'Khong con muc mo':'No open items')}</div>
          </div>
        </div>
      </section>

      <section class="deploy-summary-grid">
        <div class="deploy-summary-card"><span class="summary-label">${isVi?'Phong ban san sang':'Departments ready'}</span><strong>${readyDepartments}/${DEPLOY_CONFIG.departments.length}</strong><div>${isVi?'Dat 100% tren 6 tieu chi readiness':'Reached 100% across 6 readiness criteria'}</div></div>
        <div class="deploy-summary-card"><span class="summary-label">${isVi?'Dang trien khai':'In progress'}</span><strong>${departmentsInProgress}</strong><div>${isVi?'Phong ban dang di qua wave hien tai':'Departments moving through the active wave'}</div></div>
        <div class="deploy-summary-card"><span class="summary-label">Champion coverage</span><strong>${getChampionPercent(state)}%</strong><div>${getNumberValue(state.kpiValues.championPass)}/${DEPLOY_CONFIG.championTarget} ${isVi?'Champion da pass':'champions passed'}</div></div>
        <div class="deploy-summary-card summary-alert"><span class="summary-label">${isVi?'Tin hieu do':'Red signals'}</span><strong>${redSignals}</strong><div>${blockedDepartments} ${isVi?'phong ban bi chan':'blocked departments'} • ${redKpis} KPI ${isVi?'do':'red'}</div></div>
      </section>

      <section class="deploy-section">
        <div class="deploy-section-head"><h2>${isVi?'Lo trinh 5 pha':'Five-phase roadmap'}</h2><span>${isVi?'Nhan de chuyen pha dang theo doi':'Click to set active phase'}</span></div>
        <div class="deploy-phase-timeline">${DEPLOY_CONFIG.phases.map((phase)=>renderPhaseNode(state,phase)).join('<div class="phase-connector"></div>')}</div>
      </section>

      <section class="deploy-section">
        <div class="deploy-section-head"><h2>${isVi?'7 tru phai trien khai':'Seven mandatory deployment pillars'}</h2><span>${isVi?'Khong duoc coi go-live thanh cong neu thieu bat ky tru nao':'Go-live is not complete if any pillar is missing'}</span></div>
        <div class="deploy-pillar-grid">${DEPLOY_CONFIG.pillars.map((pillar)=>`<div class="deploy-pillar-card"><h3>${pillar.title}</h3><div class="pillar-owner">${pillar.owner}</div><p>${pillar.deliverable}</p><div class="pillar-pass">${pillar.pass}</div></div>`).join('')}</div>
      </section>

      <section class="deploy-section">
        <div class="deploy-section-head"><h2>${isVi?'Wave rollout theo phong ban':'Wave rollout by department'}</h2><span>${isVi?'Moi wave phai co readiness va support rieng':'Each wave needs its own readiness and support model'}</span></div>
        <div class="deploy-wave-grid">${[1,2,3].map((wave)=>renderWaveColumn(state,wave)).join('')}</div>
      </section>

      <section class="deploy-section">
        <div class="deploy-section-head"><h2>${isVi?'Navigator theo phong ban':'Department navigator'}</h2><span>${isVi?'Day la cua vao tai lieu va no-readiness cho tung phong ban':'This is the document entry point and readiness card for each department'}</span></div>
        <div class="deploy-dept-grid">${DEPLOY_CONFIG.departments.map((dept)=>renderDepartmentCard(state,dept)).join('')}</div>
      </section>

      <section class="deploy-section">
        <div class="deploy-section-head"><h2>${isVi?'Bang readiness va Go/No-Go':'Readiness and Go/No-Go board'}</h2><span>${isVi?'Cap nhat theo phong ban va theo 6 tieu chi readiness':'Update each department across the 6 readiness dimensions'}</span></div>
        <div class="deploy-table-wrap">
          <table class="deploy-heatmap">
            <thead>
              <tr>
                <th>${isVi?'Phong ban':'Department'}</th>
                <th>Wave</th>
                ${DEPLOY_CONFIG.readinessDimensions.map((dim)=>`<th title="${dim.help}">${dim.label}</th>`).join('')}
                <th>${isVi?'Tien do':'Progress'}</th>
              </tr>
            </thead>
            <tbody>${DEPLOY_CONFIG.departments.map((dept)=>renderReadinessRow(state,dept)).join('')}</tbody>
          </table>
        </div>
        <div class="heatmap-legend">
          <span class="hm-legend-item"><span class="hm-dot hm-pending"></span>${isVi?'Chua bat dau':'Not started'}</span>
          <span class="hm-legend-item"><span class="hm-dot hm-in_progress"></span>${isVi?'Dang thuc hien':'In progress'}</span>
          <span class="hm-legend-item"><span class="hm-dot hm-completed"></span>${isVi?'Hoan thanh':'Completed'}</span>
          <span class="hm-legend-item"><span class="hm-dot hm-blocked"></span>${isVi?'Bi chan':'Blocked'}</span>
        </div>
      </section>

      <section class="deploy-row-2col">
        <div class="deploy-section">
          <div class="deploy-section-head"><h2>${isVi?'Checklist pha hien tai':'Current phase checklist'}</h2><span>${activePhase.label} • ${activePhase.title}</span></div>
          <div class="checklist-grid">${checklist.map((item,index)=>{const key=state.currentPhase+'-'+index;const checked=!!state.checklistItems[key];return `<label class="checklist-item ${checked?'checked':''}"><input type="checkbox" ${checked?'checked':''} onchange="toggleChecklist('${key}', this.checked)"><span class="checklist-code">${item.code}</span><span class="checklist-text">${item.text}</span></label>`;}).join('')}</div>
          <div class="deploy-links-compact"><a href="../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-106-job-order-deployment-master-plan.html" target="_blank">WI-106</a><a href="../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-114-go-live-runbook-and-cutover-control.html" target="_blank">ANNEX-114</a><a href="../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-117-escalation-matrix-and-sla.html" target="_blank">ANNEX-117</a></div>
        </div>

        <div class="deploy-section">
          <div class="deploy-section-head"><h2>${isVi?'Command center va hypercare':'Command center and hypercare'}</h2><span>${isVi?'Cap nhat issue severity va support signal':'Update issue severity and support signals'}</span></div>
          <div class="command-card-grid">
            <div class="command-card"><span class="command-label">Sev-1</span><input type="number" min="0" value="${getNumberValue(state.kpiValues.sev1Open)}" onchange="updateMetric('sev1Open', this.value)"><small>${isVi?'Dung san xuat / rollback signal':'Stop / rollback signal'}</small></div>
            <div class="command-card"><span class="command-label">Sev-2</span><input type="number" min="0" value="${getNumberValue(state.kpiValues.sev2Open)}" onchange="updateMetric('sev2Open', this.value)"><small>${isVi?'Can workaround va review nhanh':'Needs workaround and fast review'}</small></div>
            <div class="command-card"><span class="command-label">Sev-3</span><input type="number" min="0" value="${getNumberValue(state.kpiValues.sev3Open)}" onchange="updateMetric('sev3Open', this.value)"><small>${isVi?'Can dong trong ngay / backlog':'Same-day close or backlog'}</small></div>
            <div class="command-card"><span class="command-label">${isVi?'Champion pass':'Champion passed'}</span><input type="number" min="0" value="${getNumberValue(state.kpiValues.championPass)}" onchange="updateMetric('championPass', this.value)"><small>${DEPLOY_CONFIG.championTarget} ${isVi?'la muc tieu toan cong ty':'is the company target'}</small></div>
          </div>
          <div class="cadence-list">${DEPLOY_CONFIG.commandCadence.map((item)=>`<div class="cadence-item"><strong>${item.title}</strong><span>${item.cadence}</span><p>${item.owner} • ${item.purpose}</p></div>`).join('')}</div>
        </div>
      </section>

      <section class="deploy-section">
        <div class="deploy-section-head"><h2>${isVi?'KPI trien khai va dashboard governance':'Deployment and governance KPIs'}</h2><span>${isVi?'Nhap gia tri thuc te de theo doi tin hieu xanh / vang / do':'Enter current values to track green / amber / red signals'}</span></div>
        <div class="kpi-mini-grid">${DEPLOY_CONFIG.kpis.map((kpi)=>renderKpiCard(state,kpi)).join('')}</div>
      </section>

      <section class="deploy-section">
        <div class="deploy-section-head"><h2>${isVi?'Document hub cho moi phong ban':'Document hub for every department'}</h2><span>${isVi?'Nhung bo tai lieu can mo nhieu nhat trong trien khai va hypercare':'Most-used document packs during rollout and hypercare'}</span></div>
        <div class="doc-group-grid">${DEPLOY_CONFIG.docsByGroup.map((group)=>`<div class="doc-group-card"><h3>${group.title}</h3><p>${group.subtitle}</p><div class="doc-group-links">${group.items.map((item)=>`<a class="deploy-doc-card" href="${item.path}" target="_blank"><span class="deploy-doc-code">${item.code}</span><span class="deploy-doc-title">${item.title}</span></a>`).join('')}</div></div>`).join('')}</div>
      </section>

      <div class="deploy-footer"><span>${isVi?'Cap nhat lan cuoi':'Last updated'}: ${state.lastUpdated?new Date(state.lastUpdated).toLocaleString('vi-VN'):'-'}</span><button class="deploy-btn-reset" onclick="resetDeployState()">${isVi?'Reset du lieu':'Reset data'}</button></div>
    </div>
  `;
}

function cycleReadiness(deptId,dimId){const state=loadDeployState();const current=(((state.deptReadiness||{})[deptId]||{})[dimId])||'pending';const cycle=['pending','in_progress','completed','blocked'];state.deptReadiness[deptId][dimId]=cycle[(cycle.indexOf(current)+1)%cycle.length];state.lastUpdated=new Date().toISOString();saveDeployState(state);renderDeployDashboard();}
function setDeployPhase(phaseId){const state=loadDeployState();const ids=DEPLOY_CONFIG.phases.map((phase)=>phase.id);const index=ids.indexOf(phaseId);ids.forEach((id,i)=>{if(i<index)state.phaseStatus[id]='completed';else if(i===index)state.phaseStatus[id]='in_progress';else state.phaseStatus[id]='pending';});state.currentPhase=phaseId;state.lastUpdated=new Date().toISOString();saveDeployState(state);renderDeployDashboard();}
function updateMetric(key,value){const state=loadDeployState();state.kpiValues[key]=value;state.lastUpdated=new Date().toISOString();saveDeployState(state);renderDeployDashboard();}
function toggleChecklist(key,checked){const state=loadDeployState();state.checklistItems[key]=checked;state.lastUpdated=new Date().toISOString();saveDeployState(state);}
function resetDeployState(){if(!confirm('Reset toan bo du lieu trien khai?'))return;localStorage.removeItem(DEPLOY_STORAGE_KEY);renderDeployDashboard();}
