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
  championTarget: 22, // Legacy fallback; runtime target is active departments × participant/backup coverage.
  phases: [
    {id:'P0', label:'Giai đoạn 0', title:'Chuẩn bị và đồng bộ',          weeks:'W0–W1',  color:'#64748b'},
    {id:'P1', label:'Giai đoạn 1', title:'Đào tạo và mức sẵn sàng',      weeks:'W2–W3',  color:'#2563eb'},
    {id:'P2', label:'Giai đoạn 2', title:'Thử nghiệm tiên phong và xác nhận', weeks:'W4–W5', color:'#d97706'},
    {id:'P3', label:'Giai đoạn 3', title:'Vận hành chính thức theo đợt', weeks:'W6–W9',  color:'#16a34a'},
    {id:'P4', label:'Giai đoạn 4', title:'Ổn định và bàn giao',          weeks:'W10–W12', color:'#7c3aed'},
  ],
  readinessDimensions: [
    {id:'docReview', label:'Tài liệu',  help:'Danh mục học, sổ tay, mã QR, liên kết SOP/WI'},
    {id:'training',  label:'Đào tạo',   help:'Brief cho trưởng phòng, đào tạo theo vai trò, đào tạo tại chỗ'},
    {id:'m365',      label:'M365',      help:'Siêu dữ liệu, phân quyền, định tuyến thư mục'},
    {id:'champion',  label:'Người dẫn dắt', help:'Người dẫn dắt chính và dự phòng theo ca'},
    {id:'pilot',     label:'Thử nghiệm', help:'Chạy song song, tra cứu, diễn tập, kiểm chứng'},
    {id:'golive',    label:'Vận hành chính thức', help:'Quyết định Đi/Không đi, chăm sóc tăng cường, bàn giao'},
  ],
  pillars: [
    {key:'gov',   title:'Điều hành và cổng quyết định', owner:'CEO / Tổ điều hành',  pass:'Quyết định Đi/Không đi đã chốt'},
    {key:'doc',   title:'Tài liệu và danh mục học',     owner:'QMS Manager',         pass:'Người dùng biết mở tài liệu nào trước'},
    {key:'m365',  title:'M365 và truy cập',             owner:'IT Manager',          pass:'Truy xuất đúng người, đúng quyền'},
    {key:'train', title:'Đào tạo và người dẫn dắt',     owner:'HR / Trưởng phòng',   pass:'Người dùng tự thao tác được'},
    {key:'pilot', title:'Thử nghiệm và xác nhận',       owner:'Sản xuất / Chất lượng', pass:'Thử nghiệm không còn KPI báo đỏ'},
    {key:'golive',title:'Vận hành chính thức và chăm sóc tăng cường', owner:'Trưởng nhóm chuyển đổi', pass:'Đợt vận hành chính thức ổn định'},
    {key:'dash',  title:'Dashboard và bằng chứng',      owner:'QMS / Chủ sở hữu dữ liệu', pass:'Số liệu dashboard đáng tin'},
  ],
  waves: [
    {n:1, label:'Đợt 1 — Thí điểm',       weeks:'W4',    note:'Phòng QA chạy thí điểm trước (program.json W4)'},
    {n:2, label:'Đợt 2 — Mở rộng SCM/Sales', weeks:'W5–W7', note:'SCM + Kinh doanh vào vận hành chính thức'},
    {n:3, label:'Đợt 3 — Sản xuất',       weeks:'W8',    note:'Sản xuất + Kỹ thuật vào vận hành (rủi ro cao nhất)'},
    {n:4, label:'Đợt 4 — Hỗ trợ + ERP',   weeks:'W9–W10',note:'Tài chính, Nhân sự, IT, EHS, Epicor (đợt cuối)'},
  ],
  departments: [
    {id:'EXE',  label:'Lãnh đạo',         wave:1, color:'#7c2d12', owner:'CEO',                  handbook:'../mom/docs/system/organization/02-Department-Handbooks/dept-executive-handbook.html',          docs:[{code:'MAN-001',path:'../mom/docs/system/quality-manual/qms-man-001-qms-manual.html'},{code:'POL-QMS-001',path:'../mom/docs/system/policies/pol-qms-001-quality-policy.html'}], record:'Management review + DEP-EXE'},
    {id:'PROD', label:'Sản xuất',         wave:3, color:'#1e40af', owner:'CEO + QA Manager',     handbook:'../mom/docs/system/organization/02-Department-Handbooks/dept-production-handbook.html',           docs:[{code:'SOP-501',path:'../mom/docs/operations/sops/05-SOP-500/sop-501-production-planning-scheduling-and-dispatch-control.html'},{code:'WI-519',path:'../mom/docs/operations/work-instructions/05-WI-500/wi-519-job-packet-quick-check-and-pre-run-verification.html'}], record:'DEP-PRO + Job Dossier'},
    {id:'ENG',  label:'Kỹ thuật',         wave:3, color:'#9d174d', owner:'Engineering Manager',  handbook:'../mom/docs/system/organization/02-Department-Handbooks/dept-engineering-handbook.html',           docs:[{code:'SOP-303',path:'../mom/docs/operations/sops/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html'},{code:'WI-302',path:'../mom/docs/operations/work-instructions/03-WI-300/wi-302-first-piece-fai-execution-and-evidence-pack.html'}], record:'Part master + Job Dossier'},
    {id:'QA',   label:'Chất lượng',       wave:1, color:'#166534', owner:'QA Manager',           handbook:'../mom/docs/system/organization/02-Department-Handbooks/dept-quality-handbook.html',              docs:[{code:'SOP-605',path:'../mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html'},{code:'WI-201',path:'../mom/docs/operations/work-instructions/02-WI-200/wi-201-quality-gates-hold-points-and-release-execution.html'}], record:'Quality records + DEP-QA'},
    {id:'SCM',  label:'Chuỗi cung ứng',   wave:2, color:'#92400e', owner:'SCM Manager',          handbook:'../mom/docs/system/organization/02-Department-Handbooks/dept-supply-chain-handbook.html',         docs:[{code:'SOP-401',path:'../mom/docs/operations/sops/04-SOP-400/sop-401-supplier-control-and-special-process.html'},{code:'WI-701',path:'../mom/docs/operations/work-instructions/07-WI-700/wi-701-receiving-iqc-traceability-and-put-away.html'}], record:'DEP-SCM + receiving/shipping'},
    {id:'SALES',label:'Kinh doanh / CS',  wave:2, color:'#3730a3', owner:'Sales Manager',        handbook:'../mom/docs/system/organization/02-Department-Handbooks/dept-sales-and-customer-service-handbook.html', docs:[{code:'SOP-201',path:'../mom/docs/operations/sops/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html'},{code:'WI-203',path:'../mom/docs/operations/work-instructions/02-WI-200/wi-203-job-dossier-evidence-pack-and-record-completeness.html'}], record:'DEP-SAL + customer records'},
    {id:'FIN',  label:'Tài chính',        wave:4, color:'#6b21a8', owner:'Finance Manager',      handbook:'../mom/docs/system/organization/02-Department-Handbooks/dept-finance-handbook.html',              docs:[{code:'SOP-803',path:'../mom/docs/operations/sops/08-SOP-800/sop-803-invoicing-job-costing-and-arap.html'}], record:'DEP-FIN + ERP SoR'},
    {id:'HR',   label:'Nhân sự',          wave:4, color:'#9f1239', owner:'HR Manager',           handbook:'../mom/docs/system/organization/02-Department-Handbooks/dept-hr-handbook.html',                   docs:[{code:'SOP-801',path:'../mom/docs/operations/sops/08-SOP-800/sop-801-competence-training-and-certification.html'}], record:'Training records'},
    {id:'IT',   label:'IT',               wave:4, color:'#155e75', owner:'IT Manager',           handbook:'../mom/docs/system/organization/02-Department-Handbooks/dept-it-handbook.html',                   docs:[{code:'ANNEX-113',path:'../mom/docs/operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-113-dashboard-deployment-access-and-refresh-control.html'},{code:'WI-102',path:'../mom/docs/operations/work-instructions/01-WI-100/wi-102-sharepoint-record-sites-libraries-and-permissions-click-by-click.html'}], record:'Digital control + access logs'},
    {id:'EHS',  label:'EHS',              wave:4, color:'#b45309', owner:'EHS Manager',          handbook:'../mom/docs/system/organization/02-Department-Handbooks/dept-ehs-handbook.html',                  docs:[{code:'SOP-802',path:'../mom/docs/operations/sops/08-SOP-800/sop-802-incident-near-miss-and-ehs.html'}], record:'DEP-EHS + incident records'},
    {id:'ERP',  label:'Epicor / ERP',     wave:4, color:'#0f766e', owner:'ERP Owner',            handbook:'../mom/docs/system/organization/02-Department-Handbooks/dept-epicor-handbook.html',                docs:[{code:'ANNEX-115',path:'../mom/docs/operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-115-epicor-transaction-and-interface-map.html'},{code:'ANNEX-118',path:'../mom/docs/operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-118-offline-fallback-kit.html'}], record:'Epicor SoR + interface logs'},
  ],
  docsByGroup: [
    {title:'Điều phối tổng', subtitle:'Cho nhà tài trợ · ban điều phối · trưởng nhóm chuyển đổi', items:[
      {code:'WI-106',  title:'Kế hoạch triển khai tổng',  path:'../mom/docs/operations/work-instructions/01-WI-100/wi-106-job-order-deployment-master-plan.html'},
      {code:'ANNEX-114', title:'Sổ tay vận hành chính thức', path:'../mom/docs/operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-114-go-live-runbook-and-cutover-control.html'},
      {code:'ANNEX-119', title:'Sổ đăng ký lộ trình thay đổi', path:'../mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-119-change-roadmap-and-priority-register.html'},
      {code:'ANNEX-117', title:'Ma trận leo thang xử lý và cam kết thời gian xử lý', path:'../mom/docs/operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-117-escalation-matrix-and-sla.html'},
    ]},
    {title:'Tiếp cận và đào tạo', subtitle:'Cho trưởng phòng · người dẫn dắt phòng · người dùng cuối', items:[
      {code:'WI-105', title:'Hướng dẫn tra cứu tài liệu',   path:'../mom/docs/operations/work-instructions/01-WI-100/wi-105-qms-document-navigation-role-based-reading-path-and-deployment.html'},
      {code:'WI-103', title:'Định tuyến thư mục M365',     path:'../mom/docs/operations/work-instructions/01-WI-100/wi-103-m365-folder-routing-training-competence-and-adoption-for-cnc-job-orders.html'},
      {code:'WI-104', title:'Thẻ tham chiếu nhanh theo vai trò', path:'../mom/docs/operations/work-instructions/01-WI-100/wi-104-m365-folder-routing-quick-cards-by-role-for-cnc-job-order.html'},
      {code:'DRL-E2E', title:'Bài diễn tập đơn hàng đầu-cuối', path:'../mom/docs/training/content/03-Practice-Drills/drill-joborder-e2e.html'},
      {code:'TRN-DEP-PLAYBOOK', title:'Kịch bản họp tuần (khung chung)', path:'../mom/docs/training/system-ops/03-Deploy-Playbook/TRN-DEP-PLAYBOOK.html'},
    ]},
    {title:'Thẻ A4 in cho hiện trường', subtitle:'Dán bảng tổ · 5 vai trò gần máy · in lại khi đổi người dẫn dắt', items:[
      {code:'WI-105-CARD-OPERATOR-CNC', title:'Người vận hành CNC',  path:'../mom/docs/operations/work-instructions/01-WI-100/wi-105-card-operator-cnc.html'},
      {code:'WI-105-CARD-SETTER',       title:'Người cài đặt máy',   path:'../mom/docs/operations/work-instructions/01-WI-100/wi-105-card-setter.html'},
      {code:'WI-105-CARD-QC-INSPECTOR', title:'QC kiểm tra',         path:'../mom/docs/operations/work-instructions/01-WI-100/wi-105-card-qc-inspector.html'},
      {code:'WI-105-CARD-PLANNER',      title:'Điều độ sản xuất',    path:'../mom/docs/operations/work-instructions/01-WI-100/wi-105-card-planner.html'},
      {code:'WI-105-CARD-LEADER',       title:'Tổ trưởng',           path:'../mom/docs/operations/work-instructions/01-WI-100/wi-105-card-leader.html'},
    ]},
    {title:'Thẻ Thứ Hai đầu tiên theo phòng', subtitle:'Dán tại bảng tổ phòng — đổi cách làm từ ngày Thứ Hai đầu tiên', items:[
      {code:'DEPT-MONDAY-INDEX', title:'Chỉ mục 10 phòng',  path:'../mom/docs/operations/work-instructions/01-WI-100/dept-monday-index.html'},
      {code:'DEPT-MONDAY-PROD',  title:'Phòng Sản xuất',    path:'../mom/docs/operations/work-instructions/01-WI-100/dept-monday-PROD.html'},
      {code:'DEPT-MONDAY-ENG',   title:'Phòng Kỹ thuật',    path:'../mom/docs/operations/work-instructions/01-WI-100/dept-monday-ENG.html'},
      {code:'DEPT-MONDAY-QA',    title:'Phòng Chất lượng',  path:'../mom/docs/operations/work-instructions/01-WI-100/dept-monday-QA.html'},
      {code:'DEPT-MONDAY-SCM',   title:'Phòng Chuỗi cung ứng', path:'../mom/docs/operations/work-instructions/01-WI-100/dept-monday-SCM.html'},
      {code:'DEPT-MONDAY-SALES', title:'Phòng Kinh doanh',  path:'../mom/docs/operations/work-instructions/01-WI-100/dept-monday-SALES.html'},
      {code:'DEPT-MONDAY-FIN',   title:'Phòng Tài chính',   path:'../mom/docs/operations/work-instructions/01-WI-100/dept-monday-FIN.html'},
      {code:'DEPT-MONDAY-HR',    title:'Phòng Nhân sự',     path:'../mom/docs/operations/work-instructions/01-WI-100/dept-monday-HR.html'},
      {code:'DEPT-MONDAY-IT',    title:'Phòng CNTT',        path:'../mom/docs/operations/work-instructions/01-WI-100/dept-monday-IT.html'},
      {code:'DEPT-MONDAY-EHS',   title:'Phòng EHS',         path:'../mom/docs/operations/work-instructions/01-WI-100/dept-monday-EHS.html'},
      {code:'DEPT-MONDAY-ERP',   title:'ERP / Epicor',      path:'../mom/docs/operations/work-instructions/01-WI-100/dept-monday-ERP.html'},
    ]},
    {title:'Hướng dẫn bấm chuột Thứ Hai (cách làm)', subtitle:'Sau khi đọc Thẻ Thứ Hai, đọc thẻ này để biết LÀM THẾ NÀO', items:[
      {code:'DEPT-MONDAY-HOWTO-PROD',  title:'PROD — cách làm',  path:'../mom/docs/operations/work-instructions/01-WI-100/dept-monday-howto-PROD.html'},
      {code:'DEPT-MONDAY-HOWTO-ENG',   title:'ENG — cách làm',   path:'../mom/docs/operations/work-instructions/01-WI-100/dept-monday-howto-ENG.html'},
      {code:'DEPT-MONDAY-HOWTO-QA',    title:'QA — cách làm',    path:'../mom/docs/operations/work-instructions/01-WI-100/dept-monday-howto-QA.html'},
      {code:'DEPT-MONDAY-HOWTO-SCM',   title:'SCM — cách làm',   path:'../mom/docs/operations/work-instructions/01-WI-100/dept-monday-howto-SCM.html'},
      {code:'DEPT-MONDAY-HOWTO-SALES', title:'SALES — cách làm', path:'../mom/docs/operations/work-instructions/01-WI-100/dept-monday-howto-SALES.html'},
      {code:'DEPT-MONDAY-HOWTO-FIN',   title:'FIN — cách làm',   path:'../mom/docs/operations/work-instructions/01-WI-100/dept-monday-howto-FIN.html'},
      {code:'DEPT-MONDAY-HOWTO-HR',    title:'HR — cách làm',    path:'../mom/docs/operations/work-instructions/01-WI-100/dept-monday-howto-HR.html'},
      {code:'DEPT-MONDAY-HOWTO-IT',    title:'IT — cách làm',    path:'../mom/docs/operations/work-instructions/01-WI-100/dept-monday-howto-IT.html'},
      {code:'DEPT-MONDAY-HOWTO-EHS',   title:'EHS — cách làm',   path:'../mom/docs/operations/work-instructions/01-WI-100/dept-monday-howto-EHS.html'},
      {code:'DEPT-MONDAY-HOWTO-ERP',   title:'ERP — cách làm',   path:'../mom/docs/operations/work-instructions/01-WI-100/dept-monday-howto-ERP.html'},
    ]},
    {title:'Tài liệu nền QMS', subtitle:'Sổ tay · Chính sách · Sổ tay phòng ban', items:[
      {code:'MAN-001',     title:'Sổ tay QMS',          path:'../mom/docs/system/quality-manual/qms-man-001-qms-manual.html'},
      {code:'POL-QMS-001', title:'Chính sách chất lượng', path:'../mom/docs/system/policies/pol-qms-001-quality-policy.html'},
      {code:'POL-QMS-002', title:'Mục tiêu chất lượng', path:'../mom/docs/system/policies/pol-qms-002-quality-objectives.html'},
      {code:'RACI',        title:'Ma trận RACI chính',  path:'../mom/docs/system/organization/04-RACI-Authority/raci-master-matrix.html'},
    ]},
    {title:'Dashboard và bằng chứng', subtitle:'Cho chủ sở hữu dữ liệu · IT · điều hành', items:[
      {code:'ANNEX-113', title:'Quản trị dashboard',     path:'../mom/docs/operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-113-dashboard-deployment-access-and-refresh-control.html'},
      {code:'ANNEX-110', title:'Từ điển KPI',            path:'../mom/docs/operations/references/01-ANNEX-100/annex-110-dashboard-kpi-dictionary-and-data-model.html'},
      {code:'WI-202',    title:'Họp điều hành theo tầng', path:'../mom/docs/operations/work-instructions/02-WI-200/wi-202-daily-management-tier-meetings-kpi-and-escalation.html'},
      {code:'WI-901',    title:'Dashboard hiệu suất',    path:'../mom/docs/operations/work-instructions/09-WI-900/wi-901-performance-dashboard.html'},
    ]},
    {title:'Dự phòng và bằng chứng', subtitle:'Cho chăm sóc tăng cường · kiểm toán · bàn giao', items:[
      {code:'ANNEX-118', title:'Bộ dự phòng offline',   path:'../mom/docs/operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-118-offline-fallback-kit.html'},
      {code:'WI-203',    title:'Bộ bằng chứng hồ sơ',   path:'../mom/docs/operations/work-instructions/02-WI-200/wi-203-job-dossier-evidence-pack-and-record-completeness.html'},
      {code:'WI-201',    title:'Cổng chất lượng',       path:'../mom/docs/operations/work-instructions/02-WI-200/wi-201-quality-gates-hold-points-and-release-execution.html'},
      {code:'ANNEX-135', title:'Kế hoạch lưu hồ sơ',    path:'../mom/docs/operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-135-m365-operational-records-file-plan-by-department-role-and-job.html'},
    ]},
  ],
  kpis: [
    {id:'KPI-FLD-01', label:'Định tuyến đúng thư mục',   target:'>=95', unit:'%', short:'TM', ownerRole:'qms_manager',
      basis:'ISO 9001:2015 §7.5.3 · AIIM Industry Watch 2023',
      rationale:'Mục tiêu ≥95% nghĩa là tối đa 1/20 tài liệu đặt sai thư mục — đủ thấp để chỉ mục tra cứu trên M365 còn đáng tin. Tham chiếu AIIM 2023: doanh nghiệp trưởng thành đạt 90–97% mức tuân thủ thư mục.',
      method:'Mỗi tuần, người dẫn dắt phòng chọn ngẫu nhiên 50 tài liệu kiểm tra, đối chiếu với ANNEX-135 sơ đồ thư mục. Tử số = số tài liệu đặt đúng thư mục, mẫu số = 50.',
      escalation:'<90% → leo thang về cổng kiểm P1-02 (mở lại khoá đào tạo người dẫn dắt). 90–94% → cảnh báo, bổ sung tăng cường đào tạo cho phòng có sai sót cao nhất.'},

    {id:'KPI-FLD-02', label:'Thời gian tra cứu',          target:'<=180', unit:'s', short:'TC', ownerRole:'qms_manager',
      basis:'ISO 9001:2015 §7.5.3 · McKinsey "Social Economy" 2012',
      rationale:'Mục tiêu ≤180 giây (3 phút) bảo đảm yêu cầu của ISO: tài liệu có sẵn đúng nơi và đúng lúc. McKinsey: nhân viên tri thức mất 1,8 giờ/ngày để tìm tài liệu — giữ ≤3 phút/lần tra cứu thì tổng thời gian tra cứu trong ngày dưới 30 phút khi có 10 lượt.',
      method:'Diễn tập hàng tuần theo ANNEX-114: người dẫn dắt bốc ngẫu nhiên 5 tài liệu, đo thời gian từ lúc nhận yêu cầu đến khi mở đúng tài liệu. Lấy trung vị của 5 lượt.',
      escalation:'>240 giây → leo thang (chỉ mục tra cứu M365 hỏng hoặc đặt sai thư mục). 180–240 giây → bổ sung diễn tập trong tuần kế tiếp.'},

    {id:'KPI-TRN-01', label:'Hoàn thành đào tạo',         target:'>=90', unit:'%', short:'ĐT', ownerRole:'hr_manager',
      basis:'ISO 9001:2015 §7.2 · Prosci ADKAR ROI 2023',
      rationale:'Mục tiêu ≥90% (không phải 100%) chấp nhận vắng mặt rải rác (nghỉ phép, ốm, người mới vào). Prosci ROI 2023: sáng kiến thay đổi có tỉ lệ hoàn thành đào tạo <80% bị mất một nửa mức áp dụng.',
      method:'Ma trận đào tạo SOP-801 ký xác nhận đã hoàn tất đào tạo tại chỗ chia cho tổng số người trong đợt hiện tại. Tính theo đợt, không tính trên tổng nhân sự công ty.',
      escalation:'<80% → chặn cổng kiểm vận hành đợt kế tiếp. 80–89% → người dẫn dắt phải báo cáo kế hoạch đuổi kịp trong 7 ngày.'},

    {id:'KPI-USE-01', label:'Người dùng tích cực mở tài liệu', target:'>=80', unit:'%', short:'NDM', ownerRole:'qms_manager',
      basis:'ISO 9001:2015 §7.5.3 · Prosci 2023 giai đoạn duy trì',
      rationale:'Mục tiêu ≥80% người dùng trong đợt triển khai có ít nhất 1 lần mở tài liệu trong 7 ngày qua. Đây là chỉ số "tài liệu đã đi vào hành vi thật". Ký xác nhận đào tạo chỉ chứng minh người ta biết tài liệu tồn tại, không chứng minh người ta đang dùng. Prosci 2023: ở giai đoạn duy trì sau triển khai, tỉ lệ tích cực <80% là tín hiệu sớm cho thấy người dùng đã trượt về "bản chui" (in ra dán tường, lưu USB, làm theo trí nhớ).',
      method:'Tử số = số người dùng (trong phạm vi triển khai) có ít nhất 1 lượt mở tài liệu chính thức trong 7 ngày gần nhất. Mẫu số = tổng số người dùng đang ở trong đợt. Đếm theo người duy nhất, không đếm theo lượt mở.',
      escalation:'<80% → trưởng QMS rà soát phòng nào tỉ lệ thấp, nhắc người dẫn dắt xác nhận lại đường dẫn và mã QR đang treo tại xưởng có còn đúng. <60% → mở lại buổi sinh hoạt đầu ca trong tuần kế tiếp.'},

    {id:'KPI-USE-02', label:'Tài liệu chết — không ai mở 14 ngày', target:'<=10', unit:'%', short:'TLC', ownerRole:'qa_manager',
      basis:'ISO 9001:2015 §7.5.3 (tài liệu có sẵn đúng nơi đúng lúc)',
      rationale:'Mục tiêu ≤10% tài liệu bắt buộc không có lượt mở trong 14 ngày liên tục. Tài liệu chết là rủi ro phiên bản: nếu không ai mở bản chính thức trong 2 tuần, khả năng cao người dùng đang theo bản cũ trong đầu, ảnh chụp điện thoại hoặc bản giấy đã quá hạn. Mỗi tài liệu chết = 1 cơ hội sai phiên bản trong sản xuất.',
      method:'Tử số = số tài liệu còn hiệu lực, thuộc danh mục đọc bắt buộc của đợt, không có lượt mở nào trong 14 ngày gần nhất. Mẫu số = tổng số tài liệu bắt buộc của đợt. Tài liệu mới phát hành dưới 14 ngày không đưa vào mẫu.',
      escalation:'>10% → QA và QMS rà lại danh mục đọc bắt buộc và sơ đồ tuyến đọc; mỗi tài liệu chết phải phân loại "giữ lại + đào tạo lại", "thay thế" hoặc "rút khỏi danh mục bắt buộc". >20% → tạm dừng phát hành mới đến khi danh mục đọc được làm sạch.'},

    {id:'KPI-USE-03', label:'Người dẫn dắt sử dụng nhiều hơn người thường', target:'>=150', unit:'%', short:'NDD', ownerRole:'qms_manager',
      basis:'Tỉ lệ tham chiếu 1,5× — người dẫn dắt phải dùng nhiều hơn người thường',
      rationale:'Mục tiêu: lượt mở trung bình của một người dẫn dắt ≥1,5 lần lượt mở trung bình của một người dùng thường. Người dẫn dắt là người gánh vai trò "hỏi gì tra liền" cho phòng — nếu họ không dùng tài liệu nhiều hơn người thường thì vai trò này chỉ tồn tại trên danh sách. Tỉ lệ thấp = người dẫn dắt đang trả lời theo trí nhớ thay vì mở tài liệu, hành vi này lan nhanh xuống ca làm.',
      method:'(Tổng lượt mở của tất cả người dẫn dắt ÷ số người dẫn dắt) ÷ (tổng lượt mở của tất cả người dùng thường ÷ số người dùng thường) × 100%. Lấy số liệu trong 7 ngày gần nhất.',
      escalation:'<150% → trưởng QMS nhắc tên cụ thể người dẫn dắt có tỉ lệ thấp tại họp Thứ Bảy. <100% (người dẫn dắt dùng ít hơn người thường) → tự động đưa vào danh sách thay người dẫn dắt; chuyển vai trò sang người dự phòng và mở đợt đào tạo lại.'},

    {id:'KPI-DEP-01', label:'Phủ người dẫn dắt (chính + dự phòng)', target:'>=100',unit:'%', short:'CH', ownerRole:'qms_manager',
      basis:'Prosci CMROI 2023 · WI-105 §4.2',
      rationale:'Mục tiêu 100% (mỗi phòng có 1 chính + 1 dự phòng) đảm bảo vận hành liên tục khi người chính nghỉ. Prosci CMROI 2023: dự án có người dẫn dắt thay đổi được chỉ định rõ tên đạt mức áp dụng cao hơn 6 lần. Người dự phòng không bắt buộc đào tạo tại chỗ đầy đủ nhưng phải nắm đường leo thang xử lý.',
      method:'Tử số = số phòng có đủ người tham dự và người dự bị được đề cử và đã ký xác nhận. Mẫu số = số phòng đang tham gia × 2 tối thiểu; nếu phòng thêm người, mẫu số tăng theo roster thực tế.',
      escalation:'<100% → cổng kiểm P0-02 chặn. Phòng nào còn thiếu người dự phòng phải đề cử trong 3 ngày làm việc.'},

    {id:'KPI-DEP-02', label:'Đóng phiếu việc đúng hạn',   target:'>=95', unit:'%', short:'ĐI', ownerRole:'ceo',
      basis:'ITIL 4 Incident Management · Gartner ITSM 2023',
      rationale:'Mục tiêu ≥95% phiếu việc được đóng trong cam kết thời gian xử lý (SLA). Tham chiếu ITIL: nhóm tốp 25% đạt ≥95%. Dưới mức này, tồn đọng dồn lại và niềm tin của người dùng bị bào mòn (Gartner ITSM 2023).',
      method:'Ma trận cam kết thời gian xử lý theo ANNEX-117: Mức 1 trong 24 giờ, Mức 2 trong 3 ngày, Mức 3 trong 1 tuần. Tử số = số phiếu việc đóng đúng SLA trong tuần này, mẫu số = tổng số phiếu đã đóng trong tuần.',
      escalation:'<85% → leo thang lên Tổ điều hành. 85–94% → tăng tần suất họp nhanh đầu ngày từ tuần này.'},

    {id:'KPI-DEP-03', label:'Tỉ lệ thay đổi thất bại',    target:'<=10', unit:'%', short:'TB', ownerRole:'qa_manager',
      basis:'DORA "State of DevOps" 2024 · ITIL 4 Change Enablement',
      rationale:'Mục tiêu ≤10% theo DORA 2024: nhóm dẫn đầu 0–15%, nhóm khá 16–30%. 10% phù hợp với mức trưởng thành trung bình — cho phép thử nghiệm mà không bào mòn niềm tin. Đo cả thay đổi tài liệu (SOP/WI), không chỉ phần mềm.',
      method:'Tử số = số thay đổi tài liệu (SOP/WI/biểu mẫu/ANNEX) phải khôi phục về bản trước, vá khẩn cấp hoặc thu hồi trong vòng 7 ngày kể từ ngày hiệu lực. Mẫu số = tổng số thay đổi đã phát hành trong tuần đó. Tính theo tuần phát hành, không theo tuần phát hiện lỗi.',
      escalation:'>15% → tạm đóng băng mọi thay đổi không trọng yếu, soát xét nguyên nhân gốc trong 5 ngày.'},

    {id:'KPI-DEP-04', label:'Thời gian phát hành (ngày)', target:'<=10', unit:'d', short:'LT', ownerRole:'it_manager',
      basis:'DORA "State of DevOps" 2024',
      rationale:'Mục tiêu ≤10 ngày từ khi đề xuất đến khi tài liệu có hiệu lực. DORA 2024: nhóm dẫn đầu <1 ngày, nhóm khá 1 ngày–1 tuần, nhóm trung bình 1 tuần–1 tháng. 10 ngày là đỉnh nhóm trung bình, đạt được với việc sửa đổi SOP/WI (không phải phần mềm).',
      method:'Tử số = tổng (ngày phê duyệt − ngày trình) của các thay đổi đã phát hành trong tuần. Mẫu số = số lượng thay đổi. Lấy trung vị (không lấy bình quân) để tránh giá trị ngoại lai.',
      escalation:'>15 ngày → soát xét nút thắt phê duyệt (thường là khâu ký). Cân nhắc luật uỷ quyền theo ANNEX-120.'},

    {id:'KPI-DEP-05', label:'Cập nhật dashboard đúng hạn', target:'>=95', unit:'%', short:'RF', ownerRole:'qms_manager',
      basis:'Gartner Data & Analytics 2023 · ANNEX-110',
      rationale:'Mục tiêu ≥95% số ô dữ liệu được cập nhật đúng lịch. Gartner: dashboard cập nhật trễ dưới mức 95% sẽ mất niềm tin của người ra quyết định trong vòng 4 tuần. Nhịp họp tầng không thể vận hành nếu KPI nguồn không kịp thời.',
      method:'Tử số = số ô KPI được người phụ trách cập nhật đúng nhịp đã cam kết (ngày / tuần / tháng tuỳ ô). Mẫu số = tổng số ô KPI đang hoạt động trên dashboard. Một ô được tính "đúng hạn" nếu giá trị mới có trước nhịp họp gần nhất sử dụng ô đó.',
      escalation:'<90% → người phụ trách ô có 3 ngày để khắc phục nguồn dữ liệu. <80% → tạm gỡ ô dữ liệu báo đỏ khỏi dashboard để tránh quyết định sai.'},

    {id:'KPI-DEP-06', label:'Tần suất phát hành (thay đổi/tuần)', target:'>=3', unit:'', short:'TS', ownerRole:'qms_manager',
      basis:'DORA "State of DevOps" 2024 (Tần suất phát hành)',
      rationale:'Đây là chỉ số thứ 4 trong bộ Four Keys của DORA (chuẩn quốc tế cho quản trị thay đổi). Nhóm dẫn đầu ≥1 lần/ngày, nhóm khá 1 lần/tuần đến 1 lần/tháng. Mục tiêu ≥3 thay đổi/tuần bảo đảm doanh nghiệp thực sự đang vận hành vòng cải tiến, không đóng băng tài liệu. Nếu = 0 trong 2 tuần liên tiếp → cảnh báo: luồng thay đổi đang tắc, hoặc cam kết thời gian soát tài liệu bị bỏ qua.',
      method:'Đếm số bản sửa đổi tài liệu (SOP / WI / biểu mẫu / ANNEX) đã được phê duyệt và có ngày hiệu lực rơi vào tuần hiện tại. Tính cả thay đổi lớn (đổi nội dung), thay đổi nhỏ (sửa câu chữ) và bản vá khẩn cấp.',
      escalation:'<1 trong 2 tuần liên tiếp → soát thông lượng của hội đồng phê duyệt thay đổi (CAB). Có thể là nút thắt phê duyệt hoặc khối lượng tồn đọng soát tài liệu quá lớn.'},

    {id:'KPI-DEP-07', label:'Thời gian phục hồi sự cố Mức 1 (giờ)', target:'<=24', unit:'h', short:'MR', ownerRole:'qms_manager',
      basis:'DORA "State of DevOps" 2024 (Thời gian phục hồi trung bình) · ITIL 4',
      rationale:'Đây là chỉ số thứ 3 trong bộ Four Keys của DORA. Nhóm dẫn đầu <1 giờ, nhóm khá <1 ngày, nhóm trung bình 1 ngày–1 tuần. Mục tiêu ≤24 giờ cho tài liệu/quy trình: thời gian từ khi phát hiện sự cố Mức 1 (tài liệu sai đã hiệu lực, người vận hành đang dùng sai) đến khi khôi phục hoặc bản vá đã phát hành. Nếu >24 giờ, người dùng đã sản xuất ≥1 ca làm việc dựa trên tài liệu sai.',
      method:'Trung vị (thời điểm đóng phiếu − thời điểm ghi nhận sự cố) của các phiếu Mức 1 trong 4 tuần gần nhất. Đếm theo giờ thực tế (24/7), không trừ ngoài giờ làm. Nếu chưa có sự cố Mức 1 nào trong cửa sổ 4 tuần: ghi "—" (không ghi 0 vì 0 giờ có nghĩa là phục hồi tức thời, không phải chưa có sự cố).',
      escalation:'>48 giờ → bắt buộc tổ chức soát xét sau sự cố trong 5 ngày. >72 giờ → leo thang lên Tổ điều hành và xem lại danh sách "người trực vận hành" cho các tài liệu trọng yếu.'},
  ],
  phaseChecklists: {
    P0:[
      {code:'P0-01', text:'Sổ tay, SOP, WI, biểu mẫu, ANNEX và mã QR đã đồng bộ'},
      {code:'P0-02', text:'Người dẫn dắt phòng và người dự phòng theo ca đã được chỉ định'},
      {code:'P0-03', text:'Siêu dữ liệu, phân quyền và định tuyến thư mục M365 đã được kiểm thử'},
      {code:'P0-04', text:'Khung dashboard đã có chủ sở hữu, nguồn dữ liệu và đường dẫn nhanh'},
      {code:'P0-05', text:'Sổ ghi vấn đề và nhịp điều hành đã sẵn sàng'},
    ],
    P1:[
      {code:'P1-01', text:'Buổi brief cho trưởng phòng đã hoàn thành'},
      {code:'P1-02', text:'Khoá huấn luyện ngắn cho người dẫn dắt phòng đã đạt'},
      {code:'P1-03', text:'Người dùng trong đợt đã hoàn tất đào tạo tại chỗ (OJT)'},
      {code:'P1-04', text:'Số liệu nền KPI và mức sẵn sàng của dashboard đã được nạp'},
    ],
    P2:[
      {code:'P2-01', text:'Đã xác nhận chạy song song và chạy độc lập trên đợt thử nghiệm'},
      {code:'P2-02', text:'Diễn tập tra cứu, truy ngược và mở nhầm bản tài liệu đã đạt'},
      {code:'P2-03', text:'Vấn đề trong đợt thử nghiệm đã đóng hoặc có kế hoạch hành động'},
      {code:'P2-04', text:'Phòng ban cốt lõi vận hành độc lập được'},
    ],
    P3:[
      {code:'P3-01', text:'Đợt hiện tại đã có trung tâm điều hành và ca trực hỗ trợ'},
      {code:'P3-02', text:'Đã chốt biên bản ký vận hành chính thức, phương án dự phòng và điều kiện khôi phục'},
      {code:'P3-03', text:'KPI báo đỏ = 0 hoặc có ghi chú ngoại lệ'},
      {code:'P3-04', text:'Người dùng mở đúng tài liệu và lưu đúng hồ sơ'},
    ],
    P4:[
      {code:'P4-01', text:'Trong giai đoạn chăm sóc tăng cường: sự cố Mức 1 = 0 và sự cố Mức 2 đã có phương án xử lý tạm ổn định'},
      {code:'P4-02', text:'Quản trị dashboard, soát xét truy cập và cam kết cập nhật dữ liệu đã được chốt'},
      {code:'P4-03', text:'Tài liệu, mã QR và danh mục học đã được cập nhật theo bài học thực tế'},
      {code:'P4-04', text:'Chủ sở hữu vận hành thường xuyên đã nhận bàn giao'},
    ],
  },
  commandCadence: [
    {title:'Họp Thứ Bảy 9:00',           owner:'CEO + QMS Manager',  cadence:'Tuần',  purpose:'Soát xét cổng kiểm, KPI, sổ ghi quyết định · ngoại lệ: W0 (14/5) Tổ điều hành họp Thứ Năm'},
    {title:'Trung tâm điều hành theo ngày', owner:'Trưởng nhóm chuyển đổi', cadence:'Ngày (thử nghiệm/chăm sóc tăng cường)', purpose:'Bảng phân loại mức độ sự cố, độ tồn đọng phiếu việc'},
    {title:'Soát xét tài liệu và dữ liệu', owner:'QMS / IT',           cadence:'Tuần',  purpose:'Đường dẫn, mã QR, cập nhật, chủ sở hữu'},
    {title:'Soát xét lãnh đạo (ISO 9.3)', owner:'CEO + Trưởng phòng', cadence:'Quý',   purpose:'Bộ hồ sơ soát xét lãnh đạo, danh mục việc phải làm'},
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
    DeployState.availability = d.availability || {absences:[]};
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
function deployInlineString(s){
  return deployEscape(JSON.stringify(String(s == null ? '' : s)));
}
function deployNum(v){ const n = parseFloat(v); return Number.isFinite(n) ? n : 0; }
function deployIsoToVi(iso){ if(!iso) return '—'; try{ return new Date(iso).toLocaleString('vi-VN'); }catch(_){ return iso; } }
function deployStaticDocByCode(code){
  const target = String(code || '').trim().toUpperCase();
  if (!target) return null;
  const staticAliases = {
    'QMS-MAN-001': {
      code: 'MAN-001',
      title: 'Sổ tay QMS',
      path: '../mom/docs/system/quality-manual/qms-man-001-qms-manual.html',
    },
    'RACI-MASTER-MATRIX': {
      code: 'RACI-MASTER-MATRIX',
      title: 'Ma trận RACI chính',
      path: '../mom/docs/system/organization/04-RACI-Authority/raci-master-matrix.html',
    },
    'AUTHORITY-MATRIX': {
      code: 'AUTHORITY-MATRIX',
      title: 'Ma trận thẩm quyền',
      path: '../mom/docs/system/organization/04-RACI-Authority/authority-matrix.html',
    },
  };
  if (staticAliases[target]) return staticAliases[target];
  for (const group of (DEPLOY_CONFIG.docsByGroup || [])) {
    for (const item of (group.items || [])) {
      if (String(item.code || '').trim().toUpperCase() === target) return item;
    }
  }
  for (const dept of (DEPLOY_CONFIG.departments || [])) {
    for (const item of (dept.docs || [])) {
      if (String(item.code || '').trim().toUpperCase() === target) return item;
    }
  }
  if (/^TRN-DEP-W\d{2}$/i.test(target)) {
    return {
      code: target,
      path: `../mom/docs/training/system-ops/03-Deploy-Playbook/${target}.html`,
    };
  }
  return null;
}
function deployDocCodeCandidates(code){
  const raw = String(code || '').trim();
  if (!raw) return [];
  const upper = raw.toUpperCase();
  const aliases = {
    'MAN-001': ['QMS-MAN-001'],
    'QMS-MAN-001': ['MAN-001'],
    'RACI': ['RACI-MASTER-MATRIX'],
    'RACI-MASTER-MATRIX': ['RACI'],
  };
  const seen = new Set();
  return [raw, upper, ...(aliases[upper] || [])].filter(candidate => {
    const key = String(candidate || '').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function deployResolveDocRecord(code){
  const candidates = deployDocCodeCandidates(code);
  if (!candidates.length) return null;
  if (typeof window !== 'undefined' && typeof window._resolveDocRecord === 'function') {
    for (const candidate of candidates) {
      const doc = window._resolveDocRecord(candidate);
      if (doc) return doc;
    }
  }
  const docs = (typeof DOCS !== 'undefined' && Array.isArray(DOCS))
    ? DOCS
    : ((typeof window !== 'undefined' && Array.isArray(window.DOCS)) ? window.DOCS : []);
  const upperCandidates = new Set(candidates.map(candidate => String(candidate).toUpperCase()));
  return docs.find(doc => upperCandidates.has(String(doc && doc.code || '').trim().toUpperCase())) || null;
}
function deployCloseWeekPanelForDocOpen(){
  if (DeployState.activeWeek == null && !DeployState.weekFullscreen) return;
  DeployState.activeWeek = null;
  DeployState.weekFullscreen = false;
  renderDeployDashboard();
}
async function deployOpenDoc(code){
  const target = String(code || '').trim();
  if (!target) return false;
  try{
    if (typeof window !== 'undefined' && typeof window.openDoc === 'function') {
      let doc = deployResolveDocRecord(target);
      if (!doc && typeof window.loadDocsFromServer === 'function') {
        await window.loadDocsFromServer();
        doc = deployResolveDocRecord(target);
      }
      if (doc) {
        if (typeof window.canAccessDoc === 'function' && !window.canAccessDoc(doc.code)) {
          if (typeof window.showToast === 'function') {
            window.showToast(lang === 'en' ? 'You do not have access to this document.' : 'Bạn không có quyền truy cập tài liệu này.');
          }
          return false;
        }
        deployCloseWeekPanelForDocOpen();
        await window.openDoc(doc);
        return true;
      }
    }
    const staticDoc = deployStaticDocByCode(target);
    if (staticDoc && staticDoc.path && typeof window !== 'undefined' && typeof window.open === 'function') {
      window.open(staticDoc.path, '_blank', 'noopener');
      return true;
    }
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert('Trang tài liệu chưa sẵn sàng: ' + target);
    }
  }catch(e){
    console.warn('[deploy] open document failed', target, e && e.message);
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert('Không mở được tài liệu: ' + target);
    }
  }
  return false;
}
function deployRewriteDocOpenHandlers(html){
  return String(html || '')
    .replace(/onclick=(["'])if\(window\.openDoc\)\s*openDoc\((["'])([^"']+)\2\);\s*return false;?\1/g,
      (_m, _q1, _q2, docCode) => `onclick="deployOpenDoc(${deployInlineString(docCode)});return false;"`)
    .replace(/onclick=(["'])openDoc\((["'])([^"']+)\2\);\s*return false;?\1/g,
      (_m, _q1, _q2, docCode) => `onclick="deployOpenDoc(${deployInlineString(docCode)});return false;"`);
}
// ── Playbook fetch + cache ────────────────────────────────────────────────
// Pulls the playbook HTML for a given deploy training code (TRN-DEP-W01..W12)
// via the existing doc_stream API and parses out individual sections so the
// week side panel can render meeting brief inline (and fullscreen mode can
// render the full playbook). Results are cached in DeployState.playbookCache
// to avoid re-fetching on tab switches.
async function deployFetchPlaybook(code){
  if (!code) return null;
  DeployState.playbookCache = DeployState.playbookCache || {};
  if (DeployState.playbookCache[code]) return DeployState.playbookCache[code];
  if (DeployState.playbookInflight && DeployState.playbookInflight[code]) return DeployState.playbookInflight[code];
  DeployState.playbookInflight = DeployState.playbookInflight || {};

  const promise = (async () => {
    try{
      const playbookPaths = [{
        path: `mom/docs/training/system-ops/03-Deploy-Playbook/${code}.html`,
        docCode: code,
      }];
      if (/^TRN-DEP-W\d{2}$/i.test(String(code || ''))) {
        playbookPaths.push({
          path: 'mom/docs/training/system-ops/03-Deploy-Playbook/TRN-DEP-PLAYBOOK.html',
          docCode: 'TRN-DEP-PLAYBOOK',
        });
      }
      // Try doc_stream first (respects auth + DCC pipeline); fall back to direct
      // path so a missing doc_stream registration doesn't kill the brief.
      const tryUrls = [];
      playbookPaths.forEach(item => {
        tryUrls.push(`api.php?action=doc_stream&path=${encodeURIComponent(item.path)}&code=${encodeURIComponent(item.docCode)}`);
        tryUrls.push('/' + item.path);
      });
      let html = '';
      for (const url of tryUrls){
        try{
          const res = await fetch(url, {credentials: 'same-origin', headers: {Accept: 'text/html'}});
          if (res.ok){
            html = await res.text();
            if (html && html.length > 1000) break;
          }
        }catch(_){}
      }
      if (!html) throw new Error('empty playbook');
      const dom = new DOMParser().parseFromString(html, 'text/html');
      const pick = (...ids) => {
        for (const id of ids) {
          const el = dom.querySelector('#' + id);
          if (el) return el.outerHTML;
        }
        return '';
      };
      const parsed = {
        cover:     pick('sec-cover'),
        objective: pick('sec-objective', 'chuong-3'),
        prep:      pick('sec-prep', 'chuong-1'),
        agenda:    pick('sec-agenda', 'chuong-2'),
        slides:    pick('sec-slides'),
        decisions: pick('sec-decisions'),
        gate:      pick('sec-gate', 'chuong-5'),
        tasks:     pick('sec-tasks', 'chuong-4'),
        nextWeek:  pick('sec-next-week'),
        docs:      pick('sec-docs'),
        risks:     pick('sec-risks'),
        lessons:   pick('sec-lessons'),
        rawTitle:  (dom.querySelector('title')?.textContent || '').trim(),
      };
      DeployState.playbookCache[code] = parsed;
      return parsed;
    }catch(e){
      console.warn('[deploy] playbook fetch failed', code, e && e.message);
      return null;
    }finally{
      delete DeployState.playbookInflight[code];
    }
  })();
  DeployState.playbookInflight[code] = promise;
  return promise;
}

async function deployHydratePlaybook(code, target){
  // Async hydration: target is a CSS selector or element where the meeting
  // brief should be injected. While loading, show a skeleton.
  if (!code) return;
  const host = typeof target === 'string' ? document.querySelector(target) : target;
  if (!host) return;
  host.innerHTML = `<div class="dwp-brief-loading">⏳ Đang tải nội dung họp chi tiết từ ${deployEscape(code)}…</div>`;
  const data = await deployFetchPlaybook(code);
  if (!data){
    host.innerHTML = `<div class="dwp-brief-empty">⚠ Không tải được cẩm nang ${deployEscape(code)}. <a href="javascript:void(0)" onclick="deployOpenDoc(${deployInlineString(code)});return false;">Mở trực tiếp</a></div>`;
    return;
  }
  host.innerHTML = deployRenderBrief(code, data, false);
}

function deployRenderBrief(code, data, fullscreen){
  const sections = fullscreen
    ? [
        ['cover','📌 Tổng quan buổi họp'],
        ['objective','🎯 Mục tiêu tuần'],
        ['prep','📋 Chuẩn bị trước họp (T-7 → T-0)'],
        ['agenda','📅 Chương trình họp 60 phút'],
        ['slides','🎞 Nội dung họp · trình bày từng mục'],
        ['decisions','✍️ Quyết định cần chốt'],
        ['gate','🚦 Cổng quyết định Đi / Không đi · CẦN + ĐỦ'],
        ['tasks','📤 Nhiệm vụ sau họp (RACI)'],
        ['nextWeek','▶ Định hướng tuần sau'],
        ['docs','📎 Tài liệu liên quan'],
        ['risks','⚠ Rủi ro và đường leo thang xử lý'],
        ['lessons','💡 Bài học rút ra'],
      ]
    : [
        ['prep','📋 Chuẩn bị trước họp (T-7 → T-0)'],
        ['agenda','📅 Chương trình họp 60 phút'],
        ['objective','🎯 Mục tiêu tuần'],
        ['tasks','📤 Nhiệm vụ sau họp (RACI)'],
        ['gate','🚦 Cổng quyết định Đi / Không đi · CẦN + ĐỦ'],
      ];
  const blocks = sections.map(([key, title]) => {
    const html = deployRewriteDocOpenHandlers(data[key]);
    if (!html) return '';
    return `
      <details class="dwp-brief-block" ${fullscreen ? 'open' : (key==='prep' ? 'open' : '')}>
        <summary><span>${title}</span></summary>
        <div class="dwp-brief-body">${html}</div>
      </details>`;
  }).join('');
  const head = `
    <div class="dwp-brief-head">
      <strong>📖 Cẩm nang ${deployEscape(code)}</strong>
      <span>Trích từ tài liệu chính thức · ${fullscreen ? 'toàn bộ 12 mục' : '5 mục trọng yếu'} ·
        <a href="javascript:void(0)" onclick="deployOpenDoc(${deployInlineString(code)});return false;">Mở tài liệu đầy đủ ↗</a>
      </span>
    </div>`;
  return head + blocks;
}

function deployRenderDocChip(code){
  const safe = deployEscape(code);
  const baseClass = 'deploy-doc-chip dwp-doc-chip';
  // Reuse the portal-wide openDoc() resolver (defined in 02-state-auth-ui.js).
  // It maps a doc-code to its file path via the DCC registry and opens the
  // correct viewer. When unavailable (e.g. anonymous test), fall back to chip.
  return `<a class="${baseClass} deploy-doc-chip-link dwp-doc-chip-link" href="javascript:void(0)" onclick="deployOpenDoc(${deployInlineString(code)});return false;" title="Mở tài liệu ${safe}">${safe}</a>`;
}
function deployFmtDate(iso){ if(!iso) return '—'; try{ return new Date(iso).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}); }catch(_){ return iso; } }
function deployTodayIso(){ return new Date().toISOString().slice(0,10); }
function deployGetPhaseDef(id){ return DEPLOY_CONFIG.phases.find(p=>p.id===id) || DEPLOY_CONFIG.phases[0]; }
function deployGateText(code){
  const pid = String(code || '').split('-')[0];
  const items = DEPLOY_CONFIG.phaseChecklists[pid] || [];
  const it = items.find(x => x.code === code);
  return it ? it.text : '';
}
function deployWeekGatesTooltip(w){
  const phase = deployGetPhaseDef(w && w.phase);
  const codes = (w && w.gateCodes) || [];
  const header = `${phase.label} — ${phase.title} (${phase.weeks})`;
  if (!codes.length){
    return `${header}\n\nTuần này không có cổng kiểm phải đóng.`;
  }
  const lines = codes.map(code => {
    const txt = deployGateText(code);
    return txt ? `• ${code} — ${txt}` : `• ${code}`;
  });
  return `${header}\n\nCổng kiểm phải đóng trong tuần này:\n${lines.join('\n')}`;
}
function deployChampionState(){
  if (!DeployState.champions || typeof DeployState.champions !== 'object') DeployState.champions = {version:2, champions:{}};
  if (!DeployState.champions.champions || typeof DeployState.champions.champions !== 'object') DeployState.champions.champions = {};
  if (!DeployState.champions.departmentRoster || typeof DeployState.champions.departmentRoster !== 'object') {
    DeployState.champions.departmentRoster = {
      active: DEPLOY_CONFIG.departments.map(d => d.id),
      custom: {},
    };
  }
  if (!Array.isArray(DeployState.champions.departmentRoster.active)) {
    DeployState.champions.departmentRoster.active = DEPLOY_CONFIG.departments.map(d => d.id);
  }
  if (!DeployState.champions.departmentRoster.custom || typeof DeployState.champions.departmentRoster.custom !== 'object') {
    DeployState.champions.departmentRoster.custom = {};
  }
  return DeployState.champions;
}
function deployNormalizeDeptId(id){
  return String(id || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 24);
}
function deployDepartmentCatalog(){
  const state = deployChampionState();
  const custom = Object.values(state.departmentRoster.custom || {}).map(d => ({
    id: deployNormalizeDeptId(d.id),
    label: d.label || d.id,
    wave: Math.max(1, Math.min(3, parseInt(d.wave, 10) || 3)),
    color: /^#[0-9a-f]{6}$/i.test(String(d.color || '')) ? d.color : '#475569',
    owner: d.owner || '',
    handbook: d.handbook || '',
    docs: Array.isArray(d.docs) ? d.docs : [],
    record: d.record || '',
    custom: true,
  })).filter(d => d.id);
  const byId = new Map();
  DEPLOY_CONFIG.departments.forEach(d => byId.set(d.id, d));
  custom.forEach(d => byId.set(d.id, d));
  return Array.from(byId.values());
}
function deployGetDept(id){
  const key = deployNormalizeDeptId(id);
  return deployDepartmentCatalog().find(d => d.id === key) || null;
}
function deployGetWeek(n){ return (DeployState.program && DeployState.program.weeks || []).find(w => (w.n|0) === (n|0)); }
function deployActiveDepartmentIds(){
  const state = deployChampionState();
  const catalogIds = new Set(deployDepartmentCatalog().map(d => d.id));
  const raw = Array.isArray(state.departmentRoster.active) ? state.departmentRoster.active : DEPLOY_CONFIG.departments.map(d => d.id);
  const active = raw.map(deployNormalizeDeptId).filter(id => id && catalogIds.has(id));
  return active.length ? Array.from(new Set(active)) : DEPLOY_CONFIG.departments.map(d => d.id);
}
function deployActiveDepartments(){
  const ids = deployActiveDepartmentIds();
  return ids.map(id => deployGetDept(id)).filter(Boolean);
}
function deployDefaultDeptId(){
  const first = deployActiveDepartments()[0];
  return first ? first.id : 'QA';
}
function deployInactiveDepartments(){
  const active = new Set(deployActiveDepartmentIds());
  return deployDepartmentCatalog().filter(d => !active.has(d.id));
}
function deployEmptyPerson(){
  return {name:'', phone:'', m365:'', ojtPass:false, username:'', employee_id:''};
}
function deployNormalizePerson(person){
  person = person || {};
  const score = deployNormalizeOjtScore(person.ojtScore);
  const passed = score == null ? !!person.ojtPass : score >= 16;
  return {
    name: String(person.name || '').trim(),
    phone: String(person.phone || '').trim(),
    m365: String(person.m365 || person.email || '').trim(),
    ojtPass: passed,
    username: String(person.username || '').trim(),
    employee_id: String(person.employee_id || person.id || '').trim(),
    bootcampAttended: deployNormalizeBootcampAttended(person.bootcampAttended),
    ojtScore: score,
    ojtPassed: passed,
    ojtSignedBy: String(person.ojtSignedBy || '').trim(),
    ojtSignedAt: String(person.ojtSignedAt || '').trim(),
  };
}
function deployNormalizeOjtScore(value){
  if (value === null || value === undefined || value === '') return null;
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n >= 0 && n <= 20 ? n : null;
}
function deployNormalizeBootcampAttended(value){
  const rows = Array.isArray(value) ? value : String(value || '').split(',');
  return Array.from(new Set(
    rows.map(n => parseInt(n, 10)).filter(n => Number.isInteger(n) && n >= 1 && n <= 4)
  )).sort((a,b) => a - b);
}
function deployPersonFilled(person){
  const p = deployNormalizePerson(person);
  return !!(p.name && !p.name.startsWith('['));
}
function deployNormalizePeople(list, legacyPerson){
  const rows = Array.isArray(list) ? list : (legacyPerson ? [legacyPerson] : []);
  return rows.map(deployNormalizePerson).filter(deployPersonFilled);
}
function deployChampionRecord(deptId){
  const state = deployChampionState();
  const key = deployNormalizeDeptId(deptId);
  const record = state.champions[key] || {};
  const participants = deployNormalizePeople(record.participants, record.primary);
  const backups = deployNormalizePeople(record.backups, record.backup);
  const normalized = {
    participants,
    backups,
    primary: participants[0] || deployEmptyPerson(),
    backup: backups[0] || deployEmptyPerson(),
    shift: record.shift || 'A',
  };
  state.champions[key] = normalized;
  return normalized;
}
function deployChampionPeople(deptId, slot){
  const rec = deployChampionRecord(deptId);
  return slot === 'backups' ? rec.backups : rec.participants;
}

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
function deployKpiOwnerLabel(ownerRole){
  const labels = {
    ceo: 'Giám đốc',
    qms_manager: 'Trưởng QMS',
    qa_manager: 'Trưởng QA',
    hr_manager: 'Trưởng Nhân sự',
    it_manager: 'Trưởng IT',
  };
  return labels[String(ownerRole || '')] || 'Chưa phân công';
}
function deployOwnerRoleFromDeptOwner(owner){
  const normalized = String(owner || '').trim().toLowerCase();
  const aliases = {
    'ceo': 'ceo',
    'giám đốc': 'ceo',
    'giam doc': 'ceo',
    'qms manager': 'qms_manager',
    'qa manager': 'qa_manager',
    'quality manager': 'qa_manager',
    'hr manager': 'hr_manager',
    'it manager': 'it_manager',
  };
  return aliases[normalized] || '';
}
function deployOverviewKpis(){
  const items = DEPLOY_CONFIG.kpis.slice();
  const usage = items.filter(kpi => String(kpi.id || '').startsWith('KPI-USE-'));
  const other = items.filter(kpi => !String(kpi.id || '').startsWith('KPI-USE-'));
  return usage.concat(other);
}
function deployKpiUpdatedLabel(kpi, kv){
  if (!String(kpi.id || '').startsWith('KPI-USE-')) return '';
  const t = kv && kv['KPI-USE_updatedAt'];
  if (!t) return '';
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `<div class="kpi-mini-updated">Cập nhật: ${hh}:${mm} ngày ${dd}/${mo}</div>`;
}
function deployDeptKpiOwnerSummary(dept){
  const ownerRole = deployOwnerRoleFromDeptOwner(dept && dept.owner);
  const items = ownerRole ? DEPLOY_CONFIG.kpis.filter(kpi => kpi.ownerRole === ownerRole) : [];
  const kv = (DeployState.readiness && DeployState.readiness.kpiValues) || {};
  const redItems = items.filter(kpi => deployKpiRag(kpi, kv[kpi.id]) === 'red');
  return { ownerRole, items, redItems };
}
function deployChampionCount(){
  let pass = 0;
  deployActiveDepartments().forEach(dept => {
    const rec = deployChampionRecord(dept.id);
    [...rec.participants, ...rec.backups].forEach(person => {
      if (deployPersonFilled(person) && person.ojtPass) pass++;
    });
  });
  return pass;
}
function deployChampionAssignedCount(){
  let assigned = 0;
  deployActiveDepartments().forEach(dept => {
    const rec = deployChampionRecord(dept.id);
    assigned += rec.participants.filter(deployPersonFilled).length;
    assigned += rec.backups.filter(deployPersonFilled).length;
  });
  return assigned;
}
function deployChampionTarget(){
  return Math.max(deployActiveDepartments().length * 2, deployChampionAssignedCount());
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
  deployActiveDepartments().forEach(d => { if (deployDeptHasBlocker(d.id)) red++; });
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
  const deptCount = deployActiveDepartments().length;
  return `
  <section class="deploy-hero">
    <div class="deploy-hero-main">
      <span class="deploy-kicker">Triển khai vận hành · ISO 9001:2015</span>
      <h1>Command Center triển khai vận hành</h1>
      <p>12 tuần · ${deptCount} phòng ban · 7 trụ · cadence Thứ Bảy 9:00. State chia sẻ qua backend.</p>
      <div class="deploy-hero-actions">
        <a class="deploy-action-link" href="../mom/docs/operations/work-instructions/01-WI-100/wi-106-job-order-deployment-master-plan.html" target="_blank">WI-106 Kế hoạch tổng</a>
        <a class="deploy-action-link" href="../mom/docs/operations/work-instructions/01-WI-100/wi-105-qms-document-navigation-role-based-reading-path-and-deployment.html" target="_blank">WI-105 Hướng dẫn tra cứu</a>
        <a class="deploy-action-link" href="../mom/docs/operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-114-go-live-runbook-and-cutover-control.html" target="_blank">ANNEX-114 Sổ tay vận hành chính thức</a>
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
  const activeDepts = deployActiveDepartments();
  const ready = activeDepts.filter(d => deployDeptProgress(d.id) >= 1).length;
  const total = activeDepts.length;
  const inProg = activeDepts.filter(d => { const p = deployDeptProgress(d.id); return p > 0 && p < 1; }).length;
  const chPass = deployChampionCount();
  const chTarget = deployChampionTarget();
  const chPct = chTarget ? Math.min(100, Math.round((chPass / chTarget) * 100)) : 0;
  const blocked = activeDepts.filter(d => deployDeptHasBlocker(d.id)).length;
  const red = deployRedSignals();
  const issuesOpen = deployIssuesOpen().length;
  return `
  <section class="deploy-summary-grid">
    <div class="deploy-summary-card">
      <span class="summary-label">Phòng ban sẵn sàng</span>
      <strong>${ready}/${total}</strong>
      <div>${inProg} đang trong đợt triển khai</div>
    </div>
    <div class="deploy-summary-card">
      <span class="summary-label">Người dẫn dắt đạt OJT</span>
      <strong>${chPct}%</strong>
      <div>${chPass}/${chTarget} đã đạt</div>
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
      <div class="deploy-section-head"><h2>7 trụ triển khai</h2><span>Thiếu trụ nào = chưa thể vận hành chính thức</span></div>
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
      <div class="deploy-section-head"><h2>KPI triển khai</h2><span>${DeployState.me.canEdit ? 'Nhập giá trị thực tế' : 'Chỉ đọc — không có quyền chỉnh'}</span></div>
      <div class="kpi-mini-grid">
        ${deployOverviewKpis().map(k => renderKpiCard(k, kv[k.id])).join('')}
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
  const hasTip = !!(kpi.rationale || kpi.basis || kpi.method);
  const isUsageKpi = String(kpi.id || '').startsWith('KPI-USE-');
  const usagePending = isUsageKpi && v === '';
  const placeholder = usagePending ? 'Đang chờ tổng hợp' : '—';
  const kv = (DeployState.readiness && DeployState.readiness.kpiValues) || {};
  const updatedLabel = deployKpiUpdatedLabel(kpi, kv);
  // Build rationale tooltip body. Uses an <aside> floating beside the card on
  // hover (CSS-only). Native `title=` on the input is also set so screen-
  // readers and keyboard-focus users get the same content.
  const tipHtml = hasTip ? `
    <aside class="kpi-tip" role="tooltip">
      <div class="kpi-tip-head">${deployEscape(kpi.label)} <span>· Mục tiêu ${deployEscape(kpi.target)}${deployEscape(kpi.unit)}</span></div>
      ${kpi.basis     ? `<div class="kpi-tip-row"><strong>Cơ sở:</strong> ${deployEscape(kpi.basis)}</div>` : ''}
      ${kpi.rationale ? `<div class="kpi-tip-row"><strong>Vì sao:</strong> ${deployEscape(kpi.rationale)}</div>` : ''}
      ${kpi.method    ? `<div class="kpi-tip-row"><strong>Đo thế nào:</strong> ${deployEscape(kpi.method)}</div>` : ''}
      ${kpi.escalation? `<div class="kpi-tip-row"><strong>Khi lệch:</strong> ${deployEscape(kpi.escalation)}</div>` : ''}
    </aside>` : '';
  // Native title attribute mirrors the tooltip in a single \n-joined string
  // so input focus / hover on the cell also reveals the rationale.
  const titleAttr = hasTip
    ? `${kpi.basis ? 'Cơ sở: ' + kpi.basis + '\n' : ''}${kpi.rationale ? 'Vì sao: ' + kpi.rationale + '\n' : ''}${kpi.method ? 'Đo: ' + kpi.method + '\n' : ''}${kpi.escalation ? 'Khi lệch: ' + kpi.escalation : ''}`
    : '';
  return `
  <div class="kpi-mini-card kpi-rag-${rag}${hasTip ? ' has-kpi-tip' : ''}">
    <div class="kpi-card-header">
      <div class="kpi-mini-icon">${deployEscape(kpi.short)}</div>
      <span class="kpi-mini-target">Mục tiêu ${deployEscape(kpi.target)}${deployEscape(kpi.unit)}</span>
    </div>
    <div class="kpi-mini-label">${deployEscape(kpi.label)}</div>
    <input type="text" class="kpi-mini-input" value="${deployEscape(v)}" placeholder="${deployEscape(placeholder)}" ${ro ? 'disabled' : ''} title="${deployEscape(titleAttr)}" onchange="deployUpdateMetric('${deployEscape(kpi.id)}', this.value)">
    ${usagePending ? '<div class="kpi-mini-hint">Đang chờ hệ thống tổng hợp lượt mở tài liệu. Số liệu sẽ tự xuất hiện khi đủ dữ liệu 7 ngày đầu — không cần thao tác thủ công.</div>' : ''}
    <div class="kpi-mini-owner">Chủ trì: ${deployEscape(deployKpiOwnerLabel(kpi.ownerRole))}</div>
    ${updatedLabel}
    ${tipHtml}
  </div>`;
}

// ── Tab 2: Lộ trình (Timeline) ────────────────────────────────────────────
function renderTabTimeline(){
  const weeks = (DeployState.program && DeployState.program.weeks) || [];
  const cw = deployCurrentWeek();
  // Detect any week that overrides the default Saturday cadence (e.g. the
  // exec-only W0 on a Thursday) so the header is honest about exceptions.
  const overrides = weeks.filter(w => w.dayOverride);
  const overrideNote = overrides.length
    ? overrides.map(w => `W${w.n|0} ${deployEscape(w.dayOverride)} ${deployFmtDate(w.date)}`).join(', ')
    : '';
  return `
  <div class="deploy-tab-panel active" id="dtab-timeline">
    <section class="deploy-section">
      <div class="deploy-section-head">
        <h2>Lộ trình 12 tuần · cadence Thứ Bảy 9:00${overrideNote ? ` · ngoại lệ ${overrideNote}` : ''}</h2>
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
  // Show day-of-week if the week overrides the default Saturday cadence
  // (e.g. W0 Thursday). The chip makes the exception visible without
  // having to open the side panel.
  const dayBadge = w.dayOverride
    ? `<span class="tlw-day-override" title="Ngoại lệ cadence: tuần này họp ${deployEscape(w.dayOverride)}">${deployEscape(w.dayOverride)}</span>`
    : '';
  const attendeesBadge = w.attendees && w.attendees.length
    ? `<span class="tlw-attendees" title="${deployEscape((w.attendeesNote || ''))}">${w.attendees[0] === 'all_departments' ? '👥 ĐẠI DIỆN PHÒNG BAN' : '🔒 ' + w.attendees.length + ' đại biểu'}</span>`
    : '';
  const gatesTip = deployEscape(deployWeekGatesTooltip(w));
  return `
  <button class="tl-week ${statusClass}" onclick="deployOpenWeek(${w.n|0})" style="--phase-color:${phase.color}" title="${gatesTip}">
    <div class="tlw-head">
      <span class="tlw-num">W${w.n|0}</span>
      <span class="tlw-date">${deployFmtDate(w.date)}${dayBadge}</span>
    </div>
    <div class="tlw-phase">${deployEscape(phase.label)}</div>
    <div class="tlw-label">${deployEscape(w.label || '')}</div>
    <div class="tlw-foot">
      ${decisionBadge || attendeesBadge}
      ${(w.gateCodes||[]).length ? `<span class="tlw-gate">${(w.gateCodes||[]).join(' · ')}</span>` : ''}
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
  const venue = (DeployState.program && DeployState.program.meetingVenue) || 'Phòng họp lớn HESEM — 60 phút';
  const attendeesSource = (DeployState.program && DeployState.program.meetingAttendeesSource) || '';
  return `
  <div class="deploy-tab-panel active" id="dtab-meetings">
    <section class="deploy-section">
      <div class="deploy-section-head">
        <h2>Khuôn họp Thứ Bảy 9:00 — ${deployEscape(venue)}</h2>
        <span>Mẫu chương trình họp cố định, lặp đúng mỗi tuần. Thành phần dự họp lấy từ bảng Phòng ban tham gia ISO.</span>
      </div>
      ${attendeesSource ? `<p class="agenda-attendees-source">${deployEscape(attendeesSource)}</p>` : ''}
      <div class="agenda-template-grid">
        ${tpl.map(t => `
          <div class="agenda-slot">
            <span class="agenda-slot-time">${deployEscape(t.slot)}</span>
            <strong>${deployEscape(t.label)}</strong>
            <div class="agenda-owner">${deployEscape(t.owner)}</div>
            <p>${deployEscape(t.note)}</p>
          </div>`).join('')}
      </div>
    </section>
    <section class="deploy-section">
      <div class="deploy-section-head">
        <h2>Lịch họp và biên bản</h2>
        <span>${meetings.length} biên bản · bấm một tuần ở tab Lộ trình để tạo mới</span>
      </div>
      ${meetings.length === 0 ? '<div class="deploy-empty">Chưa có biên bản. Mở tab <strong>Lộ trình</strong>, bấm tuần và bấm <strong>Tạo biên bản</strong>.</div>' : `
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
  const activeDepts = deployActiveDepartments();
  const chTarget = deployChampionTarget();
  return `
  <div class="deploy-tab-panel active" id="dtab-departments">
    ${renderDepartmentRosterManager(activeDepts)}
    <section class="deploy-section">
      <div class="deploy-section-head"><h2>Triển khai theo đợt</h2><span>4 đợt · vận hành chính thức theo thứ tự rủi ro</span></div>
      <div class="deploy-wave-grid">
        ${(DEPLOY_CONFIG.waves || [{n:1},{n:2},{n:3},{n:4}]).map(w => renderWaveColumn(w.n)).join('')}
      </div>
    </section>
    <section class="deploy-section">
      <div class="deploy-section-head"><h2>Bảng sẵn sàng 6 chiều</h2><span>Bấm ô để xoay: chưa bắt đầu → đang thực hiện → hoàn thành → bị chặn</span></div>
      <div class="deploy-table-wrap">
        <table class="deploy-heatmap">
          <thead>
            <tr>
              <th>Phòng ban</th>
              <th>Đợt</th>
              ${DEPLOY_CONFIG.readinessDimensions.map(dim => `<th title="${deployEscape(dim.help)}">${deployEscape(dim.label)}</th>`).join('')}
              <th>KPI tôi chịu</th>
              <th>Tiến độ</th>
            </tr>
          </thead>
          <tbody>${activeDepts.map(d => renderReadinessRow(d)).join('')}</tbody>
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
      <div class="deploy-section-head"><h2>Danh sách người dẫn dắt</h2><span>Người tham dự + dự bị — ${deployChampionCount()}/${chTarget} đã đạt OJT</span></div>
      <div class="champion-grid">
        ${activeDepts.map(d => renderChampionCard(d)).join('')}
      </div>
    </section>
    ${renderAvailabilitySection(activeDepts)}
  </div>`;
}

function renderAvailabilitySection(activeDepts){
  const state = DeployState.availability || {absences:[]};
  const list = Array.isArray(state.absences) ? state.absences : [];
  const today = new Date().toISOString().slice(0,10);
  // Sắp xếp: đang vắng hôm nay lên đầu, kế đến vắng sắp tới, cuối là quá khứ.
  const sorted = list.slice().sort((a,b) => {
    const aActive = (a.fromDate <= today && a.toDate >= today) ? 0 : (a.toDate >= today ? 1 : 2);
    const bActive = (b.fromDate <= today && b.toDate >= today) ? 0 : (b.toDate >= today ? 1 : 2);
    if (aActive !== bActive) return aActive - bActive;
    return String(a.fromDate||'').localeCompare(String(b.fromDate||''));
  }).slice(0, 20);
  const ro = !DeployState.me.canEdit;
  const optDepts = activeDepts.map(d => `<option value="${deployEscape(d.id)}">${deployEscape(d.label)}</option>`).join('');
  return `
  <section class="deploy-section">
    <div class="deploy-section-head">
      <h2>Lịch vắng người dẫn dắt</h2>
      <span>Trưởng phòng đăng ký trước → cron 06:30 cảnh báo Trưởng QMS nếu chưa có người trực thay</span>
    </div>
    ${ro ? '' : `
    <form class="deploy-availability-form" onsubmit="deploySaveAvailability(event); return false;">
      <div class="form-grid">
        <label>Tên người dẫn dắt<input type="text" name="championName" required placeholder="VD: Nguyễn Văn A"></label>
        <label>Phòng<select name="deptId" required>${optDepts}</select></label>
        <label>Vai trò<select name="role"><option value="primary">Chính</option><option value="backup">Dự phòng</option></select></label>
        <label>Từ ngày<input type="date" name="fromDate" required></label>
        <label>Tới ngày<input type="date" name="toDate" required></label>
        <label>Lý do<input type="text" name="reason" required placeholder="VD: Nghỉ phép · đi công tác · ốm"></label>
        <label>Người trực thay<input type="text" name="coverBy" placeholder="Trống nếu chưa sắp xếp"></label>
        <label>SĐT người trực thay<input type="tel" name="coverPhone" placeholder="VD: 0912 345 678"></label>
      </div>
      <button class="deploy-btn deploy-btn-sm" type="submit">Đăng ký vắng</button>
    </form>`}
    <div class="deploy-availability-list">
      ${sorted.length === 0 ? '<div class="deploy-availability-empty">Chưa có lịch vắng nào được đăng ký.</div>' : `
        <table class="deploy-availability-table">
          <thead><tr>
            <th>Người</th><th>Phòng</th><th>Vai trò</th><th>Từ</th><th>Tới</th><th>Lý do</th><th>Người trực thay</th><th>Trạng thái</th>
          </tr></thead>
          <tbody>
          ${sorted.map(a => {
            const active = (a.fromDate <= today && a.toDate >= today);
            const past = (a.toDate < today);
            const covered = !!String(a.coverBy || '').trim();
            const cls = active ? (covered ? 'av-active-covered' : 'av-active-uncovered') : (past ? 'av-past' : 'av-future');
            const label = active
              ? (covered ? 'Vắng hôm nay · có người thay' : '⚠ Vắng hôm nay · CHƯA có người thay')
              : (past ? 'Đã kết thúc' : 'Vắng sắp tới');
            return `
            <tr class="${cls}">
              <td>${deployEscape(a.championName||'')}</td>
              <td>${deployEscape(a.deptId||'')}</td>
              <td>${a.role === 'backup' ? 'Dự phòng' : 'Chính'}</td>
              <td>${deployEscape(a.fromDate||'')}</td>
              <td>${deployEscape(a.toDate||'')}</td>
              <td>${deployEscape(a.reason||'')}</td>
              <td>${a.coverBy ? `${deployEscape(a.coverBy)}${a.coverPhone ? ' · '+deployEscape(a.coverPhone) : ''}` : '<em>chưa có</em>'}</td>
              <td>${label}</td>
            </tr>`;
          }).join('')}
          </tbody>
        </table>`}
    </div>
  </section>`;
}

async function deploySaveAvailability(ev){
  const form = ev.target;
  const fd = new FormData(form);
  const payload = {};
  for (const [k,v] of fd.entries()) payload[k] = String(v).trim();
  if (!payload.championName || !payload.deptId || !payload.fromDate || !payload.toDate || !payload.reason){
    alert('Cần điền đủ: Tên, Phòng, Từ ngày, Tới ngày, Lý do.');
    return;
  }
  if (payload.fromDate > payload.toDate){
    alert('Từ ngày phải trước hoặc bằng Tới ngày.');
    return;
  }
  try {
    const res = await deployApi('deploy_availability_save', payload);
    if (res && res.data){
      DeployState.availability = res.data;
      renderDeployDashboard();
    }
  } catch (e){
    console.error('[deploy] availability save failed', e);
    alert('Lỗi đăng ký vắng: ' + (e && e.message || e));
  }
}

function renderDepartmentRosterManager(activeDepts){
  const inactive = deployInactiveDepartments();
  return `
  <section class="deploy-section deploy-roster-section">
    <div class="deploy-section-head">
      <h2>Phòng ban tham gia ISO</h2>
      <span>${activeDepts.length} đang tham gia · ${inactive.length} có thể thêm lại</span>
    </div>
    <div class="deploy-roster-toolbar">
      <div class="deploy-roster-chips">
        ${activeDepts.map(d => `<span class="deploy-roster-chip" style="--dept-color:${deployEscape(d.color)}">${deployEscape(d.label)}</span>`).join('')}
      </div>
      ${DeployState.me.canEdit ? `<button class="deploy-btn" type="button" onclick="deployOpenDepartmentForm()">+ Thêm phòng ban</button>` : ''}
    </div>
  </section>`;
}

function renderWaveColumn(wave){
  const depts = deployActiveDepartments().filter(d => d.wave === wave);
  const meta = (DEPLOY_CONFIG.waves || []).find(w => w.n === wave) || {label: 'Đợt ' + wave, weeks: ''};
  return `
  <div class="wave-card">
    <div class="wave-card-head" title="${deployEscape(meta.note || '')}">
      <strong>${deployEscape(meta.label)}</strong>
      <span>${meta.weeks ? deployEscape(meta.weeks) + ' · ' : ''}${depts.length} phòng</span>
    </div>
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
  const ownedKpis = deployDeptKpiOwnerSummary(dept);
  const ownedTotal = ownedKpis.items.length;
  const ownedRed = ownedKpis.redItems.length;
  const ownedText = ownedTotal ? (ownedRed ? `${ownedRed}/${ownedTotal} đỏ` : `${ownedTotal}`) : '—';
  const ownedTitle = ownedTotal
    ? `Chủ trì: ${deployKpiOwnerLabel(ownedKpis.ownerRole)} · ${ownedKpis.items.map(kpi => kpi.id).join(', ')}`
    : 'Chưa có KPI gắn với trưởng phòng này';
  const ownedClass = ownedRed ? 'hm-blocked' : (ownedTotal ? 'hm-completed' : 'hm-pending');
  const ownedStyle = ownedRed ? 'border:2px solid #dc2626' : '';
  return `
  <tr>
    <td>
      <div class="readiness-dept-name">
        <span class="wave-color" style="background:${dept.color}"></span>
        <span>${deployEscape(dept.label)}</span>
        <small>${deployEscape(dept.owner)}</small>
      </div>
    </td>
    <td><span class="deploy-wave-badge wave-${dept.wave}" title="${deployEscape(((DEPLOY_CONFIG.waves||[]).find(w=>w.n===dept.wave)||{}).note || '')}">Đợt ${dept.wave}${(()=>{const m=(DEPLOY_CONFIG.waves||[]).find(w=>w.n===dept.wave); return m && m.weeks ? ' · '+m.weeks : '';})()}</span></td>
    ${DEPLOY_CONFIG.readinessDimensions.map(dim => {
      const v = r[dim.id] || 'pending';
      const onClick = ro ? '' : `onclick="deployCycleReadiness('${dept.id}','${dim.id}')"`;
      return `<td class="heatmap-cell hm-${v} ${ro ? 'hm-readonly' : ''}" ${onClick} title="${deployEscape(dept.label)} · ${deployEscape(dim.label)} · ${v}">${deployStatusIcon(v)}</td>`;
    }).join('')}
    <td class="heatmap-cell ${ownedClass}" style="${ownedStyle}" title="${deployEscape(ownedTitle)}">${deployEscape(ownedText)}</td>
    <td><strong>${pct}%</strong><div class="dept-mini-bar"><span style="width:${pct}%;background:${dept.color}"></span></div></td>
  </tr>`;
}

function renderChampionCard(dept){
  const ch = deployChampionRecord(dept.id);
  const ro = !DeployState.me.canEdit;
  return `
  <div class="champion-card">
    <div class="champion-card-head">
      <span class="wave-color" style="background:${dept.color}"></span>
      <strong>${deployEscape(dept.label)}</strong>
      <span class="champion-shift">Ca ${deployEscape(ch.shift || 'A')}</span>
      ${!ro ? `<button class="deploy-btn-link champion-card-remove" type="button" onclick="deployRemoveDepartment('${dept.id}')" title="Bớt phòng ban khỏi roster">✕</button>` : ''}
    </div>
    <div class="champion-form">
      ${renderChampionSlotGroup(dept, 'participants', 'Người tham dự', ch.participants || [], ro)}
      ${renderChampionSlotGroup(dept, 'backups', 'Người dự bị', ch.backups || [], ro)}
      <button class="deploy-btn deploy-btn-sm" ${ro?'disabled':''} onclick="deploySaveChampion('${dept.id}')">Lưu thay đổi</button>
    </div>
  </div>`;
}

function renderChampionSlotGroup(dept, slot, label, people, ro){
  const list = deployNormalizePeople(people);
  return `
  <div class="champion-slot-group champion-slot-${slot}" data-deploy-champion-group="${dept.id}|${slot}">
    <div class="champion-slot-row champion-slot-group-head">
      <span class="champion-slot-label">${deployEscape(label)} <small>${list.length}</small></span>
      <div class="champion-slot-actions">
        ${!ro ? `<button class="deploy-btn deploy-btn-xs" type="button" onclick="deployOpenPicker('${dept.id}','${slot}')">+ Thêm người</button>` : ''}
      </div>
    </div>
    ${list.length ? list.map((person, idx) => renderChampionPersonSlot(dept, slot, idx, person, ro)).join('') : `
      <div class="champion-person-empty">— Chưa chọn —</div>
    `}
  </div>`;
}

function renderChampionPersonSlot(dept, slot, index, person, ro){
  const filled = deployPersonFilled(person);
  const u = filled ? findUserForChampionPerson(person) : null;
  const key = `${dept.id}|${slot}|${index}`;
  return `
  <div class="champion-slot ${filled?'champion-slot-filled':'champion-slot-empty'}" data-deploy-champion-person="${key}">
    <div class="champion-slot-row">
      <span class="champion-slot-label">${slot === 'backups' ? 'Dự bị' : 'Tham dự'} ${index + 1}</span>
      <div class="champion-slot-actions">
        ${!ro ? `<button class="deploy-btn deploy-btn-xs" type="button" onclick="deployOpenPicker('${dept.id}','${slot}',${index})">Đổi người</button>` : ''}
        ${filled && !ro ? `<button class="deploy-btn-link" type="button" onclick="deployRemoveChampionPerson('${dept.id}','${slot}',${index})" title="Bỏ chọn">✕</button>` : ''}
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
      <input type="checkbox" ${person.ojtPass?'checked':''} ${ro?'disabled':''} data-deploy-champion="${key}|ojtPass">
      Đã đạt bài kiểm OJT
    </label>
    <input type="hidden" data-deploy-champion="${key}|name" value="${deployEscape(person.name||'')}">
    <input type="hidden" data-deploy-champion="${key}|phone" value="${deployEscape(person.phone||'')}">
    <input type="hidden" data-deploy-champion="${key}|m365" value="${deployEscape(person.m365||'')}">
    <input type="hidden" data-deploy-champion="${key}|username" value="${deployEscape(person.username||'')}">
    <input type="hidden" data-deploy-champion="${key}|employee_id" value="${deployEscape(person.employee_id||'')}">
  </div>`;
}

function renderChampionOjtBlock(dept, slot, person, ro){
  const slotKey = slot === 'backups' ? 'backup' : 'primary';
  const p = deployNormalizePerson(person);
  const attended = p.bootcampAttended.reduce((acc,n) => (acc[n]=true, acc), {});
  const statusText = p.ojtScore == null
    ? 'Chưa chấm'
    : (p.ojtPassed ? `✓ Đậu — ${p.ojtScore}/20` : `✗ Chưa đậu — ${p.ojtScore}/20`);
  const statusClass = p.ojtScore == null ? 'none' : (p.ojtPassed ? 'ok' : 'fail');
  const prevText = p.ojtSignedAt
    ? `${p.ojtSignedBy || '—'} · ${deployIsoToVi(p.ojtSignedAt)}`
    : '—';
  const bootcampLabels = {
    1: 'Buổi 1 — Vai trò người dẫn dắt',
    2: 'Buổi 2 — Đọc DCC header trong 60 giây',
    3: 'Buổi 3 — Mở hồ sơ và ghi sự cố',
    4: 'Buổi 4 — Cây leo thang xử lý',
  };
  return `
  <div class="champion-ojt-block" data-dept="${deployEscape(dept.id)}" data-slot="${slotKey}">
    <div class="champion-ojt-head">
      <strong>Bài kiểm năng lực OJT</strong>
      <span class="champion-ojt-status champion-ojt-status-${statusClass}">${deployEscape(statusText)}</span>
    </div>
    <p class="champion-ojt-help">Trưởng QMS hoặc Trưởng QA chấm sau buổi đánh giá tại xưởng. Đậu khi điểm ≥ 16/20.</p>
    <div class="champion-ojt-bootcamps">
      ${[1,2,3,4].map(n => `
        <label class="champion-ojt-bootcamp"><input type="checkbox" value="${n}" ${attended[n]?'checked':''} ${ro?'disabled':''} data-ojt-bootcamp> ${deployEscape(bootcampLabels[n])}</label>
      `).join('')}
    </div>
    <div class="champion-ojt-score-row">
      <label>Điểm OJT (0–20): <input type="number" min="0" max="20" step="1" value="${p.ojtScore == null ? '' : p.ojtScore}" ${ro?'disabled':''} class="champion-ojt-score-input"></label>
      <button class="deploy-btn deploy-btn-sm" type="button" ${ro?'disabled':''} onclick="deploySaveChampionOjt('${deployEscape(dept.id)}','${slotKey}')">Lưu điểm OJT</button>
    </div>
    <small class="champion-ojt-prev">Lần chấm gần nhất: ${deployEscape(prevText)}</small>
  </div>`;
}

async function deploySaveChampionOjt(deptId, slot){
  const block = document.querySelector(`.champion-ojt-block[data-dept="${deptId}"][data-slot="${slot}"]`);
  if (!block) { alert('Không tìm thấy ô chấm OJT.'); return; }
  const scoreInput = block.querySelector('.champion-ojt-score-input');
  const score = parseInt(scoreInput && scoreInput.value, 10);
  if (!Number.isInteger(score) || score < 0 || score > 20){
    alert('Điểm OJT phải là số nguyên từ 0 tới 20.');
    return;
  }
  const bootcampAttended = Array.from(block.querySelectorAll('input[data-ojt-bootcamp]:checked'))
    .map(c => parseInt(c.value, 10))
    .filter(n => Number.isInteger(n) && n >= 1 && n <= 4);
  try {
    const res = await deployApi('deploy_champion_ojt_save', {deptId, slot, score, bootcampAttended});
    if (res && res.data) {
      DeployState.champions = res.data;
      renderDeployDashboard();
    }
  } catch (e) {
    console.error('[deploy] champion ojt save failed', e);
    alert('Lỗi lưu điểm OJT: ' + (e && e.message || e));
  }
}

function findUserByName(name){
  if (!name) return null;
  const list = DeployState.users || [];
  return list.find(u => u.name === name) || list.find(u => u.name && u.name.toLowerCase() === name.toLowerCase()) || null;
}
function findUserForChampionPerson(person){
  const p = deployNormalizePerson(person);
  const list = DeployState.users || [];
  return (p.username && list.find(u => u.username === p.username))
    || (p.employee_id && list.find(u => u.employee_id === p.employee_id || u.id === p.employee_id))
    || findUserByName(p.name);
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
            ${deployActiveDepartments().map(d => `<option value="${d.id}">${deployEscape(d.label)}</option>`).join('')}
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
        ${(c.docs || []).map(d => deployRenderDocChip(d)).join('')}
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
          <h2>W${wn} · ${w.dayOverride ? deployEscape(w.dayOverride) + ' ' : ''}${deployFmtDate(w.date)} · ${deployEscape(w.label)}</h2>
          ${w.playbookCode ? `
            <div class="dwp-playbook-link">
              <button type="button" class="dwp-playbook-btn"
                onclick="deployOpenDoc(${deployInlineString(w.playbookCode)})"
                title="Mở cẩm nang triển khai chi tiết cho tuần W${wn}">
                📖 Mở cẩm nang W${wn} · ${deployEscape(w.playbookCode)}
              </button>
              <button type="button" class="dwp-fullscreen-btn"
                onclick="deployToggleWeekFullscreen()"
                title="Hiển thị biên bản họp toàn màn hình">
                ⛶ Toàn màn hình
              </button>
              <small>Tài liệu chi tiết: nội dung họp · phân công · cổng quyết định Đi / Không đi · định hướng tuần kế tiếp</small>
            </div>` : ''}
        </div>
        <button class="dwp-close" onclick="deployCloseWeek()" aria-label="Đóng">×</button>
      </header>

      ${w.playbookCode ? `
        <section class="dwp-section dwp-meeting-brief-section">
          <h3>📋 Nội dung họp chi tiết · trích từ cẩm nang</h3>
          <div id="dwp-meeting-brief" data-playbook-code="${deployEscape(w.playbookCode)}">
            <div class="dwp-brief-loading">⏳ Đang tải nội dung họp chi tiết từ ${deployEscape(w.playbookCode)}…</div>
          </div>
        </section>` : ''}

      ${(w.attendees && w.attendees.length) ? `
        <section class="dwp-section dwp-attendees-section">
          <h3>Thành phần dự họp</h3>
          <div class="dwp-attendees-chips">
            ${w.attendees[0] === 'all_departments'
              ? `<span class="dwp-attendee-chip chip-all">👥 Đại diện ${deployActiveDepartments().length} phòng ban + Tổ điều hành</span>`
              : w.attendees.map(a => `<span class="dwp-attendee-chip chip-restricted">🔒 ${deployEscape(a)}</span>`).join('')}
          </div>
          ${w.attendeesNote ? `<p class="dwp-attendees-note">${deployEscape(w.attendeesNote)}</p>` : ''}
        </section>` : ''}

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
          ${(w.requiredDocs || []).map(code => deployRenderDocChip(code)).join('') || '<span class="deploy-empty-inline">— (không neo tài liệu)</span>'}
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
    ['participants','backups'].forEach(s => {
      deployNormalizePeople(ch && ch[s], ch && (s === 'participants' ? ch.primary : ch.backup)).forEach((person, idx) => {
        if (deployPersonFilled(person)) used.add(`${person.name}|${dId}|${s}|${idx}`);
      });
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
  if (roleFilter === 'dept_only' && dh.length) {
    list = list.filter(u => dh.some(h => (u.dept||'').toUpperCase().startsWith(h)));
  } else if (roleFilter === 'role_hint' && rh.length) {
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
    const ad = dh.length && dh.some(h => (a.dept||'').toUpperCase().startsWith(h)) ? 0 : 1;
    const bd = dh.length && dh.some(h => (b.dept||'').toUpperCase().startsWith(h)) ? 0 : 1;
    if (ad !== bd) return ad - bd;
    const ar = rh.includes(a.role) ? 0 : 1;
    const br = rh.includes(b.role) ? 0 : 1;
    if (ar !== br) return ar - br;
    return (a.name||'').localeCompare(b.name||'', 'vi');
  });

  const slotLabel = p.slot === 'backups' ? 'Người dự bị' : 'Người tham dự';

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
          ${renderPickerChip('dept_only', 'Cùng phòng', roleFilter, dh.length ? all.filter(u => dh.some(h => (u.dept||'').toUpperCase().startsWith(h))).length : all.length)}
          ${renderPickerChip('role_hint', 'Vai trò phù hợp', roleFilter, rh.length ? all.filter(u => rh.includes(u.role)).length : 0)}
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
  const usedElsewhere = Array.from(used).find(k => k.startsWith(u.name + '|') && !k.startsWith(`${u.name}|${deptId}|`));
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

function deployOpenPicker(deptId, slot, index){
  DeployState.picker = {
    deptId,
    slot: slot === 'backups' ? 'backups' : 'participants',
    index: Number.isInteger(index) ? index : null,
    query:'',
    roleFilter:'dept_only',
  };
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
  const champs = deployChampionState();
  const rec = deployChampionRecord(p.deptId);
  const list = p.slot === 'backups' ? rec.backups : rec.participants;
  const nextPerson = {
    name: u.name,
    phone: u.phone || '',
    m365: u.email || '',
    username: u.username || '',
    employee_id: u.employee_id || u.id || '',
    ojtPass: p.index != null && list[p.index] ? !!list[p.index].ojtPass : false,
  };
  if (p.index != null && list[p.index]) list[p.index] = nextPerson;
  else list.push(nextPerson);
  if (!champs.champions[p.deptId]) champs.champions[p.deptId] = rec;
  champs.champions[p.deptId].participants = rec.participants;
  champs.champions[p.deptId].backups = rec.backups;
  champs.champions[p.deptId].primary = rec.participants[0] || deployEmptyPerson();
  champs.champions[p.deptId].backup = rec.backups[0] || deployEmptyPerson();
  DeployState.champions = champs;
  DeployState.picker = null;
  renderDeployDashboard();
  deploySaveChampion(p.deptId);
}

function deployPickerAssignManual(){
  alert('Vui lòng thêm người dùng trong Admin > Người dùng trước khi bổ nhiệm.');
}

function deployRemoveChampionPerson(deptId, slot, index){
  if (!confirm('Bỏ người này khỏi roster?')) return;
  const rec = deployChampionRecord(deptId);
  const list = slot === 'backups' ? rec.backups : rec.participants;
  list.splice(index, 1);
  rec.primary = rec.participants[0] || deployEmptyPerson();
  rec.backup = rec.backups[0] || deployEmptyPerson();
  renderDeployDashboard();
  deploySaveChampion(deptId);
}

function deployOpenDepartmentForm(){
  const inactive = deployInactiveDepartments();
  const defaultChoice = inactive[0] ? inactive[0].id : '__custom__';
  deployOpenFormDialog({
    kicker: 'Phòng ban ISO',
    title: 'Thêm phòng ban tham gia',
    accentColor: '#2563eb',
    submitLabel: 'Thêm phòng ban',
    fields: [
      {key:'deptId', label:'Phòng ban có sẵn', type:'select', value: defaultChoice,
        options: [
          {value:'__custom__', label:'Phòng ban mới'},
          ...inactive.map(d => ({value:d.id, label:d.label})),
        ]},
      {key:'customId', label:'Mã phòng mới', type:'text', value:'', placeholder:'VD: MNT'},
      {key:'customLabel', label:'Tên phòng mới', type:'text', value:'', placeholder:'VD: Bảo trì'},
      {key:'owner', label:'Owner', type:'text', value:'', placeholder:'VD: Maintenance Manager'},
      {key:'wave', label:'Đợt triển khai', type:'select', value:'4', options:[
        {value:'1', label:'Đợt 1 — Thí điểm (W4)'},
        {value:'2', label:'Đợt 2 — SCM/Sales (W5–W7)'},
        {value:'3', label:'Đợt 3 — Sản xuất (W8)'},
        {value:'4', label:'Đợt 4 — Hỗ trợ + ERP (W9–W10)'},
      ]},
      {key:'color', label:'Màu nhận diện', type:'text', value:'#475569', placeholder:'#475569'},
      {key:'record', label:'Hồ sơ liên quan', type:'text', value:'', placeholder:'VD: DEP-MNT + PM records'},
    ],
    onSubmit: (v) => {
      const state = deployChampionState();
      const active = deployActiveDepartmentIds();
      const custom = {...(state.departmentRoster.custom || {})};
      let deptId = deployNormalizeDeptId(v.deptId);
      if (deptId === '__CUSTOM__' || deptId === '') {
        deptId = deployNormalizeDeptId(v.customId);
        if (!deptId || !String(v.customLabel || '').trim()) {
          alert('Cần nhập mã và tên phòng ban mới.');
          return;
        }
        custom[deptId] = {
          id: deptId,
          label: String(v.customLabel || deptId).trim(),
          owner: String(v.owner || '').trim(),
          wave: Math.max(1, Math.min(3, parseInt(v.wave, 10) || 3)),
          color: /^#[0-9a-f]{6}$/i.test(String(v.color || '')) ? String(v.color) : '#475569',
          record: String(v.record || '').trim(),
          handbook: '',
          docs: [],
          custom: true,
        };
      }
      if (!active.includes(deptId)) active.push(deptId);
      return deploySaveDepartmentRoster(active, custom);
    },
  });
}

function deployRemoveDepartment(deptId){
  const active = deployActiveDepartmentIds();
  if (active.length <= 1) {
    alert('Roster cần ít nhất 1 phòng ban đang tham gia.');
    return;
  }
  const dept = deployGetDept(deptId);
  if (!confirm('Bớt phòng ban ' + (dept ? dept.label : deptId) + ' khỏi triển khai ISO? Dữ liệu người đã chọn sẽ được giữ để có thể thêm lại.')) return;
  const next = active.filter(id => id !== deployNormalizeDeptId(deptId));
  const custom = {...(deployChampionState().departmentRoster.custom || {})};
  deploySaveDepartmentRoster(next, custom);
}

async function deploySaveDepartmentRoster(activeIds, customDepartments){
  try{
    const res = await deployApi('deploy_department_roster_save', {
      departmentIds: activeIds,
      customDepartments: customDepartments || {},
    });
    DeployState.champions = res.data;
    renderDeployDashboard();
  }catch(e){ console.error('[deploy] department roster failed', e); alert('Lỗi lưu danh sách phòng ban: ' + e.message); }
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
  DeployState.weekFullscreen = false;
  renderDeployDashboard();
  // After the panel renders, fire off the playbook fetch + hydration.
  setTimeout(() => {
    const host = document.getElementById('dwp-meeting-brief');
    if (host && host.dataset.playbookCode){
      deployHydratePlaybook(host.dataset.playbookCode, host);
    }
  }, 30);
}
function deployCloseWeek(ev){
  if (ev && ev.target && !ev.target.classList.contains('deploy-week-overlay')) return;
  DeployState.activeWeek = null;
  DeployState.weekFullscreen = false;
  renderDeployDashboard();
}
function deployToggleWeekFullscreen(){
  DeployState.weekFullscreen = !DeployState.weekFullscreen;
  const overlay = document.querySelector('.deploy-week-overlay');
  if (!overlay) return;
  overlay.classList.toggle('dwp-fullscreen', !!DeployState.weekFullscreen);
  // When entering fullscreen, swap the brief from 5-section short view to
  // the full 12-section view (re-render using cached parsed data).
  const host = document.getElementById('dwp-meeting-brief');
  if (host && host.dataset.playbookCode){
    const code = host.dataset.playbookCode;
    const data = DeployState.playbookCache && DeployState.playbookCache[code];
    if (data) host.innerHTML = deployRenderBrief(code, data, !!DeployState.weekFullscreen);
    else deployHydratePlaybook(code, host).then(() => {
      // After fetch, if we're now in fullscreen, re-render with full sections.
      const fresh = DeployState.playbookCache && DeployState.playbookCache[code];
      if (fresh && DeployState.weekFullscreen) host.innerHTML = deployRenderBrief(code, fresh, true);
    });
  }
  // Toggle button label
  const btn = overlay.querySelector('.dwp-fullscreen-btn');
  if (btn) btn.textContent = DeployState.weekFullscreen ? '⊟ Thoát toàn màn hình' : '⛶ Toàn màn hình';
}
window.deployToggleWeekFullscreen = deployToggleWeekFullscreen;

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
  if (!DeployState.me.canSignOff) { alert('Cần quyền Giám đốc / Trưởng QMS để ký cổng.'); return; }
  const notes = document.getElementById('dwpSignOffNotes')?.value || '';
  if (!confirm('Ký gate W' + weekN + ' với quyết định ' + decision.toUpperCase() + '?')) return;
  try{
    const res = await deployApi('deploy_week_signoff', {weekN, decision, notes});
    DeployState.program = res.data;
    renderDeployDashboard();
  }catch(e){ console.error('[deploy] week signoff failed', e); alert('Lỗi ký cổng: ' + e.message); }
}

async function deploySaveChampion(deptId){
  const readList = (slot) => {
    return Array.from(document.querySelectorAll(`[data-deploy-champion-person^="${deptId}|${slot}|"]`)).map((row, idx) => {
      const get = (field) => {
        const el = row.querySelector(`[data-deploy-champion="${deptId}|${slot}|${idx}|${field}"]`);
        if (!el) return field === 'ojtPass' ? false : '';
        return field === 'ojtPass' ? !!el.checked : el.value;
      };
      return deployNormalizePerson({
        name: get('name'),
        phone: get('phone'),
        m365: get('m365'),
        username: get('username'),
        employee_id: get('employee_id'),
        ojtPass: get('ojtPass'),
      });
    }).filter(deployPersonFilled);
  };
  const participants = readList('participants');
  const backups = readList('backups');
  const payload = {
    deptId,
    participants,
    backups,
    primary: participants[0] || deployEmptyPerson(),
    backup: backups[0] || deployEmptyPerson(),
    shift: 'A',
  };
  try{
    const res = await deployApi('deploy_champion_save', payload);
    DeployState.champions = res.data;
    renderDeployDashboard();
  }catch(e){ console.error('[deploy] champion failed', e); alert('Lỗi lưu người dẫn dắt: ' + e.message); }
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
      {key:'deptId', label:'Phòng ban', type:'select', required:true, value: existing?.deptId || deployDefaultDeptId(),
        options: deployActiveDepartments().map(d => ({value:d.id, label: d.label}))},
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
  }catch(e){ console.error('[deploy] drill failed', e); alert('Lỗi ghi diễn tập: ' + e.message); }
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
        value: existing?.scopeDepts || [deployDefaultDeptId()],
        options: deployActiveDepartments().map(d => ({value: d.id, label: d.label}))},
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
        value: existing?.deptId || deployDefaultDeptId(),
        options: deployActiveDepartments().map(d => ({value:d.id, label: d.label}))},
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
  }catch(e){ console.error('[deploy] review failed', e); alert('Lỗi lưu xem xét: ' + e.message); }
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
    hint: 'Xóa sẵn sàng, vấn đề, diễn tập, biên bản họp và trạng thái ký cổng; giữ khung 12 tuần, tài liệu ISO và mẫu họp.',
    fields: [
      {
        type: 'static',
        label: 'Ảnh hưởng',
        value: 'Toàn bộ checklist, tiến độ phòng ban, quyết định gate đã ký, sổ vấn đề và biên bản họp tuần sẽ bị xóa khỏi trạng thái triển khai.',
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
        // Re-open the dialog with a visible warning instead of blocking
        // alert(). Native alert() pauses the renderer, which is bad UX
        // and also freezes Chrome MCP / Selenium-driven testing.
        deployOpenFormDialog({
          title: 'Reset state triển khai',
          kicker: '❌ Mật khẩu sai · thử lại',
          accentColor: '#dc2626',
          submitLabel: '🗑 Xác nhận reset',
          hint: 'Nhập đúng mật khẩu reset (hỏi QMS Manager).',
          fields: [
            {
              type: 'static',
              label: 'Lỗi',
              value: 'Mật khẩu không khớp. Đã hủy reset, dữ liệu vẫn nguyên vẹn.',
            },
            {
              type: 'password',
              key: 'password',
              label: 'Mật khẩu xác nhận',
              required: true,
              maxLength: 12,
              placeholder: '••••••',
            },
          ],
          onSubmit: async (v2) => {
            if ((v2.password || '').trim() !== DEPLOY_RESET_PASSWORD) return;
            await deployResetStateConfirmed();
          },
        });
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
window.deployOpenDoc = deployOpenDoc;
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
window.deploySaveChampionOjt = deploySaveChampionOjt;
window.deploySaveAvailability = deploySaveAvailability;
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
window.deployRemoveChampionPerson = deployRemoveChampionPerson;
window.deployClearChampion = (deptId, slot) => deployRemoveChampionPerson(deptId, slot === 'backup' ? 'backups' : 'participants', 0);
window.deployOpenDepartmentForm = deployOpenDepartmentForm;
window.deployRemoveDepartment = deployRemoveDepartment;
window.deploySaveDepartmentRoster = deploySaveDepartmentRoster;
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
