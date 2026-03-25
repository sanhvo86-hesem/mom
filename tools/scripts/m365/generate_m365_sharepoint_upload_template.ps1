param(
    [string]$OutputRoot = (Join-Path (Get-Location) 'M365-SharePoint-Upload-Template-Operational'),
    [int]$Year = (Get-Date).Year
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Ensure-Dir {
    param([string]$Path)
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

function Ensure-ChildDirs {
    param(
        [string]$BasePath,
        [string[]]$ChildNames
    )

    foreach ($child in $ChildNames) {
        Ensure-Dir -Path (Join-Path $BasePath $child)
    }
}

function Ensure-ZoneWithCurrentAndYear {
    param(
        [string]$ZoneRoot,
        [string[]]$CurrentChildren = @(),
        [string[]]$YearChildren = @()
    )

    $currentRoot = Join-Path $ZoneRoot '00-Current'
    $yearRoot = Join-Path $ZoneRoot $yearFolder

    Ensure-Dir -Path $currentRoot
    Ensure-Dir -Path $yearRoot

    if ($CurrentChildren.Count -gt 0) {
        Ensure-ChildDirs -BasePath $currentRoot -ChildNames $CurrentChildren
    }

    if ($YearChildren.Count -gt 0) {
        Ensure-ChildDirs -BasePath $yearRoot -ChildNames $YearChildren
    }
}

function Ensure-ZoneWithActiveAndYear {
    param(
        [string]$ZoneRoot,
        [string[]]$ActiveChildren = @(),
        [string[]]$YearChildren = @()
    )

    $activeRoot = Join-Path $ZoneRoot '00-Active'
    $yearRoot = Join-Path $ZoneRoot $yearFolder

    Ensure-Dir -Path $activeRoot
    Ensure-Dir -Path $yearRoot

    if ($ActiveChildren.Count -gt 0) {
        Ensure-ChildDirs -BasePath $activeRoot -ChildNames $ActiveChildren
    }

    if ($YearChildren.Count -gt 0) {
        Ensure-ChildDirs -BasePath $yearRoot -ChildNames $YearChildren
    }
}

$yearFolder = [string]$Year
$departmentCatalog = @(
    @{
        Code = 'EXEC'
        Name = 'Executive'
        Roles = @('ROLE-CEO', 'ROLE-PDIR')
        Operations = @('01-Strategy-Deployment', '02-Management-Review-Inputs', '03-Board-and-Customer-Commitments', '04-Risk-and-Escalation')
        Logs = @('01-Objective-Tracking', '02-Decision-Log', '03-Action-Tracking', '04-Stakeholder-Commitments')
        Interfaces = @('01-Leadership-Communication', '02-Board-and-Management-Packs')
    },
    @{
        Code = 'QMS'
        Name = 'Quality-Management-System'
        Roles = @('ROLE-QMSE', 'ROLE-IAO')
        Operations = @('01-Document-Control-Operations', '02-Change-Control-Coordination', '03-Management-System-Maintenance', '04-Improvement-Coordination')
        Logs = @('01-Document-Issue-Log', '02-Training-Effectiveness-Log', '03-System-Review-Log', '04-Retention-Review')
        Interfaces = @('01-Audit-Input-Packs', '02-MR-Input-Packs')
    },
    @{
        Code = 'QA'
        Name = 'Quality-Assurance'
        Roles = @('ROLE-QAM', 'ROLE-QE', 'ROLE-QCL', 'ROLE-QCCMM', 'ROLE-MCS')
        Operations = @('01-Incoming-and-In-Process-Control', '02-Final-Inspection-and-Release', '03-Calibration-Coordination', '04-Customer-Complaint-Response')
        Logs = @('01-Hold-Release-Log', '02-Gage-Status-Log', '03-Deviation-Reaction-Log', '04-Inspection-Coverage-Log')
        Interfaces = @('01-Customer-Complaint-Response', '02-Supplier-Quality-Pack')
    },
    @{
        Code = 'ENG'
        Name = 'Engineering'
        Roles = @('ROLE-ELM', 'ROLE-DFM', 'ROLE-PE', 'ROLE-CAM')
        Operations = @('01-Feasibility-and-DFM', '02-CAM-and-Method-Release', '03-Tooling-and-Fixture-Control', '04-Technical-Change-Execution')
        Logs = @('01-Release-Queue', '02-Revision-Change-Log', '03-Fixture-Status-Log', '04-Programming-Error-Learnings')
        Interfaces = @('01-RFQ-Response-Pack', '02-Process-Readiness-Pack', '03-CAPA-Engineering-Response')
    },
    @{
        Code = 'PRO'
        Name = 'Production'
        Roles = @('ROLE-CWM', 'ROLE-PPLN', 'ROLE-PIE', 'ROLE-SHFL', 'ROLE-SET', 'ROLE-CNC', 'ROLE-DBTL', 'ROLE-DBT', 'ROLE-CPS', 'ROLE-CPT', 'ROLE-MNT')
        Operations = @('01-Dispatch-and-Readiness', '02-Setup-and-First-Piece', '03-Shift-Handover-and-WIP', '04-Secondary-Operations-and-Clean-Pack', '05-Tooling-Maintenance-and-Breakdown')
        Logs = @('01-Machine-History-Log', '02-Downtime-Log', '03-Shift-Handover-Log', '04-Tool-Life-Log', '05-Line-Clearance-Log')
        Interfaces = @('01-Readiness-Control-Tower', '02-Pack-Ready-Handover')
    },
    @{
        Code = 'SCM'
        Name = 'Supply-Chain-Management'
        Roles = @('ROLE-SCMM', 'ROLE-BUY', 'ROLE-WHC', 'ROLE-TCR', 'ROLE-LSC')
        Operations = @('01-Supplier-Qualification-and-Performance', '02-PO-and-Subcontract-Follow-Up', '03-Receiving-and-IQC-Handoff', '04-Warehouse-and-Traceability', '05-Shipping-and-Packing-Coordination')
        Logs = @('01-Expedite-Log', '02-Shortage-Risk-Log', '03-Receiving-Exception-Log', '04-Lot-Traceability-Log', '05-Carrier-Performance-Log')
        Interfaces = @('01-Processor-Flowdown-Pack', '02-Ship-Pack-Interface', '03-SCAR-Response-Pack')
    },
    @{
        Code = 'SAL'
        Name = 'Sales-and-Customer-Service'
        Roles = @('ROLE-CS', 'ROLE-EST')
        Operations = @('01-RFQ-and-Quote-Pack', '02-Contract-Review-and-Order-Ack', '03-Customer-Change-and-Escalation', '04-Complaint-and-RMA-Coordination')
        Logs = @('01-Quote-Lead-Time-Log', '02-Commitment-Change-Log', '03-Customer-Communication-Log', '04-RMA-Tracking')
        Interfaces = @('01-Order-Release-Pack', '02-Customer-Communication-Pack')
    },
    @{
        Code = 'FIN'
        Name = 'Finance'
        Roles = @('ROLE-FM', 'ROLE-APAR', 'ROLE-GLPAY')
        Operations = @('01-Invoice-Pack-and-AR', '02-AP-and-Payment-Proposal', '03-Job-Costing-and-Margin', '04-Period-Close-and-Reconciliation', '05-Tax-and-Statutory-Submission')
        Logs = @('01-Collection-Log', '02-Payment-Release-Log', '03-Close-Issue-Log', '04-Cash-Forecast-Log', '05-Financial-Control-Review')
        Interfaces = @('01-Invoice-Pack-Interface', '02-Payroll-Input-Receipt', '03-Costing-Review-Packs')
    },
    @{
        Code = 'HR'
        Name = 'Human-Resources'
        Roles = @('ROLE-HRM')
        Operations = @('01-Manpower-and-Recruitment', '02-Onboarding-and-Induction', '03-Performance-and-Probation', '04-Employee-Relations-and-Discipline', '05-Offboarding-and-Revocation')
        Logs = @('01-Headcount-Log', '02-Recruitment-Funnel-Log', '03-Leave-and-Attendance-Interface', '04-Asset-Return-Tracking', '05-Access-Revocation-Tracking')
        Interfaces = @('01-Access-Request-Pack', '02-Payroll-Input-Pack', '03-Disciplinary-and-Grievance-Pack')
    },
    @{
        Code = 'EHS'
        Name = 'Environment-Health-and-Safety'
        Roles = @('ROLE-EHS')
        Operations = @('01-Risk-and-Hazard-Control', '02-Permit-and-PPE-Control', '03-Incident-and-Near-Miss-Response', '04-Emergency-Preparedness', '05-Environmental-Monitoring')
        Logs = @('01-Incident-Log', '02-Unsafe-Condition-Log', '03-PPE-Issue-Log', '04-Inspection-Log', '05-Waste-and-Environment-Log')
        Interfaces = @('01-Restart-Release-Pack', '02-EHS-MR-Input-Pack')
    },
    @{
        Code = 'IT'
        Name = 'Information-Technology'
        Roles = @('ROLE-ITA')
        Operations = @('01-Service-Request-and-Endpoint', '02-Identity-and-Access-Coordination', '03-M365-Configuration-Change', '04-Backup-Restore-and-Recovery', '05-Security-and-Incident-Response')
        Logs = @('01-Ticket-Log', '02-Asset-Compliance-Log', '03-Backup-Job-Exception-Log', '04-Access-Review-Tracker', '05-Security-Issue-Log')
        Interfaces = @('01-Deployment-Packs', '02-Recovery-Packs')
    },
    @{
        Code = 'ERP'
        Name = 'ERP-Administration'
        Roles = @('ROLE-ERPA')
        Operations = @('01-Role-and-Access-Governance', '02-Master-Data-Control', '03-UAT-Deployment-and-Cutover', '04-Transaction-Error-and-Recovery', '05-Report-and-Interface-Control')
        Logs = @('01-SoD-Review-Log', '02-Master-Data-Change-Tracker', '03-Deployment-Calendar', '04-Error-Reentry-Log', '05-Integration-Monitoring-Log')
        Interfaces = @('01-UAT-Pack', '02-Cutover-Pack', '03-Reconciliation-Pack')
    }
)
$personDossierFolders = @(
    '00-Identity-and-Employment-Profile',
    '01-Recruitment-and-Offer',
    '02-Employment-Contract-and-Legal',
    '03-Onboarding-Role-and-Access',
    '04-Training-and-Certification-Link',
    '05-Probation-Performance-and-Development',
    '06-Payroll-and-Benefits-Restricted',
    '07-Leave-Attendance-and-Time-Case',
    '08-Medical-and-Fit-to-Work-Restricted',
    '09-Assets-Access-and-Issued-Items',
    '10-Role-Change-Transfer-and-Promotion',
    '11-Disciplinary-and-Legal-Restricted',
    '12-Offboarding-and-Exit',
    '13-Sealed-Copies-and-Legal-Hold'
)

$visitorDossierFolders = @(
    '00-Visit-Profile',
    '01-Approval-NDA-and-Scope',
    '02-Safety-Induction-and-Restriction',
    '03-Badge-Access-and-Escort',
    '04-Closure-and-Incident'
)

$peopleRestrictedOperationSubfoldersCurrent = @(
    '01-Current-Control-and-Queue',
    '02-Working-Case-Files',
    '03-Issued-Outputs-and-Approvals',
    '04-Supporting-Evidence-and-Sealed-Copies',
    '05-Review-and-Close'
)

$peopleRestrictedOperationSubfoldersYear = @(
    '01-Closed-Cases-and-Cycles',
    '02-Yearly-Evidence-Pack',
    '03-Review-and-Attestation',
    '04-Sealed-History'
)

$peopleRestrictedSharedZones = [ordered]@{
    '01-Payroll-Cycle-Control' = @{ Current = $peopleRestrictedOperationSubfoldersCurrent; Year = $peopleRestrictedOperationSubfoldersYear }
    '02-Leave-and-Attendance-Case-Control' = @{ Current = $peopleRestrictedOperationSubfoldersCurrent; Year = $peopleRestrictedOperationSubfoldersYear }
    '03-Medical-Fit-to-Work-Control' = @{ Current = $peopleRestrictedOperationSubfoldersCurrent; Year = $peopleRestrictedOperationSubfoldersYear }
    '04-Disciplinary-and-Grievance-Case-Control' = @{ Current = $peopleRestrictedOperationSubfoldersCurrent; Year = $peopleRestrictedOperationSubfoldersYear }
    '05-Offboarding-and-Revocation-Control' = @{ Current = $peopleRestrictedOperationSubfoldersCurrent; Year = $peopleRestrictedOperationSubfoldersYear }
    '06-Recruitment-and-Pending-Start-Control' = @{ Current = $peopleRestrictedOperationSubfoldersCurrent; Year = $peopleRestrictedOperationSubfoldersYear }
}

$departmentLiveControlFolders = @(
    '01-Boards-and-Queues',
    '02-Master-Lists-and-Mappings',
    '03-Dashboards-and-Views',
    '04-Open-Issues-and-Action-Trackers',
    '05-Link-Indexes-and-Controlled-Views',
    '06-Department-Calendar-and-Roster',
    '07-Shared-Reference-Indexes'
)

$departmentGovernanceCurrentFolders = @('01-Org-and-Responsibility', '02-Objective-and-KPI-Control', '03-Meeting-and-Review-Cadence', '04-Risk-and-Escalation-Current', '05-Controlled-Reference-Link-Index')
$departmentGovernanceYearFolders = @('01-Department-Review-Packs', '02-Objective-and-KPI-Reviews', '03-Risk-and-Escalation-History', '04-Compliance-and-Review-Outputs')
$departmentProjectActiveFolders = @('01-Improvement-Backlog', '02-Active-Projects', '03-Open-Actions-and-Benefits-Tracking')
$departmentProjectYearFolders = @('01-Closed-Projects', '02-Improvement-Closures', '03-Benefit-Verification-History')
$departmentOperationSubfolders = @('01-Inputs-and-Requests', '02-Working-Control', '03-Issued-Outputs', '04-Photos-External-Evidence-and-Exports', '05-Follow-Up-and-Closure')
$departmentLogSubfolders = @('01-Live-Register', '02-Supporting-Evidence', '03-Review-and-Close')
$departmentInterfaceSubfolders = @('01-Outgoing-Released', '02-Returned-Acknowledgements', '03-Reissue-and-Change-History')
$departmentRoleTeamFolders = @('00-Team-Inbox', '01-Team-Draft', '02-Team-Review', '03-Team-Promote', '04-Team-Offline', '05-Team-Ref', '90-Employee-WB', '91-Deputy-Handover', '99-Clear-90d')
$employeeWorkbenchFolders = @('00-My-Inbox', '01-My-WIP', '02-My-Review', '03-My-Handoff', '04-My-Offline-Pack', '05-My-Ref', '99-Clear-30d')
$departmentReferenceFolders = @('01-Customer-Received', '02-Supplier-Received', '03-Standards-and-Manuals', '04-Department-Work-Aids-and-Visuals', '05-Portal-Exports-and-System-Downloads', '06-Convenience-Copies', '07-To-Be-Culled')
$departmentArchiveFolders = @('01-Closed-Year-Packs', '02-Sealed-History-and-Snapshots', '03-Retention-and-Archive-Index')

$jobGateFolderMap = [ordered]@{
    '00_Admin-Control' = @('01-Job-Index', '02-Approvals-and-Status', '03-Change-History', '04-Customer-Requirement-Summary', '05-Link-to-Part-Master')
    '01_G0-Contract-Kickoff' = @('01-RFQ-and-Quote-Inputs', '02-Contract-Review-and-PO', '03-Kickoff-and-Planning', '04-Customer-Change-Inputs', '05-Customer-Property-and-Consigned')
    '02_G1-Engineering-Release' = @('01-DFM-Review', '02-Baseline-Package', '03-CAM-NC-Release', '04-Routing-and-Method', '05-Engineering-Change-Inputs')
    '03_G2-IQC-Receiving' = @('01-Receiving-Log', '02-Material-Certs', '03-IQC-Results', '04-Lot-Heat-Traceability', '05-Handoff-to-Production')
    '04_G3-Setup-Release' = @('01-Router-and-Traveler', '02-Setup-Sheets-and-Tool-Lists', '03-Program-and-Method-Links', '04-Gage-and-Fixture-Readiness', '05-Pre-Run-and-Work-Transfer')
    '05_G4-FAI-First-Piece' = @('01-FAI-Request-and-Plan', '02-Ballooned-Drawing', '03-Raw-Measurement-Data', '04-Photos-and-Deviations', '05-Release-Decision')
    '06_G5-IPQC-Production' = @('01-Traveler-and-Operation-Evidence', '02-IPQC-AQL-SPC', '03-WIP-Hold-Restart', '04-Tool-Life-and-Downtime', '05-Outsource-and-Receiving-Handoff')
    '07_G6-Final-QC-Packaging' = @('01-Final-Inspection-and-CoC-Draft', '02-Packaging-and-Clean-Pack', '03-Labels-and-SSCC-Staging', '04-Photos-and-Preservation', '05-Release-Handoff')
    '08_G7-Ship-Release' = @('01-Ship-Release-Approval', '02-Packing-List-and-Labels', '03-Carrier-and-POD', '04-Customer-Shipment-Pack', '05-Invoice-Interface-Snapshot')
    '07_NCR-CAPA-Deviation' = @('01-NCR', '02-Concession-Waiver', '03-Rework-and-Reinspection', '04-CAPA-8D', '05-Customer-Deviation-Approval')
    '99_Archive-Locked' = @('01-Final-Evidence-Index', '02-Sealed-Export-Pack', '03-Archive-Note')
}
$trainingZoneMap = [ordered]@{
    '01-Training-Plans' = @{ Current = @('01-Annual-and-Department-Plans', '02-Open-Training-Needs', '03-Plan-Review-and-Change'); Year = @('01-Issued-Training-Plans', '02-Plan-Completion', '03-Year-End-Review') }
    '02-Attendance-and-Class-Records' = @{ Current = @(); Year = @('01-Class-Pack', '02-Attendance', '03-Test-and-Evaluation') }
    '03-OJT-Evidence' = @{ Current = @(); Year = @('01-OJT-Pack', '02-Supervisor-Verification', '03-Closure') }
    '04-Competence-Assessments' = @{ Current = @(); Year = @('01-Assessment-Pack', '02-Score-and-Decision', '03-Gap-and-Action') }
    '05-Certification-Register' = @{ Current = @('01-Current-Certification-Index', '02-Expiring-Within-90d', '03-Renewal-Queue'); Year = @('01-Issued-Certificates', '02-Expired-and-Renewed', '03-Review-and-Close') }
    '06-Skill-Matrix-and-Coverage' = @{ Current = @('01-Department-Coverage', '02-Role-Coverage', '03-Employee-Competence-Index'); Year = @('01-Coverage-Snapshots', '02-Gap-Closure-History') }
    '07-Academy-Content-Control' = @{ Current = @('01-Controlled-Content', '02-Draft-and-Revision', '03-Retired-Content'); Year = @() }
    '08-Safety-Induction-and-Special-Briefings' = @{ Current = @(); Year = @('01-Induction-Pack', '02-Attendance-and-Attestation', '03-Action-and-Follow-Up') }
}

$systemZoneMap = [ordered]@{
    '01-Access-and-Identity' = @{ Current = @('01-Open-Requests-and-Queue', '02-Current-Role-State', '03-Current-Exceptions-and-Risk', '04-Current-Issued-Outputs'); Year = @('01-Closed-Requests-and-Cases', '02-Review-and-Attestation', '03-Snapshots-and-Evidence') }
    '02-M365-and-SharePoint-Config' = @{ Current = @('01-Current-Baseline', '02-Open-Changes-and-Releases', '03-Current-Permission-Model', '04-Current-Label-and-Retention-Model'); Year = @('01-Release-and-Change-Evidence', '02-Configuration-Snapshots', '03-Review-and-Attestation') }
    '03-Epicor-Master-Data-and-Role-Control' = @{ Current = @('01-Open-Requests-and-Queue', '02-Current-Role-Matrix', '03-Current-Exceptions-and-SOD', '04-Current-Master-Data-Control'); Year = @('01-Closed-Requests-and-Cases', '02-Review-and-Attestation', '03-Snapshots-and-Evidence') }
    '04-Deployment-UAT-Cutover' = @{ Current = @('01-Open-Release-Calendar', '02-Current-UAT-and-Cutover-Pack', '03-Current-Rollback-and-Hypercare'); Year = @('01-Closed-Deployments', '02-UAT-and-Cutover-Evidence', '03-Review-and-Close') }
    '05-Backup-Restore-and-Recovery' = @{ Current = @('01-Current-Backup-Control', '02-Open-Exceptions-and-Failures', '03-Current-Recovery-Readiness'); Year = @('01-Closed-Backup-Reports', '02-Restore-Tests-and-Drills', '03-Review-and-Attestation') }
    '06-Incident-and-Problem-Management' = @{ Current = @('01-Open-Incidents', '02-Open-Problems-and-RCA', '03-Containment-and-Recovery', '04-Current-Lessons-and-Alerts'); Year = @('01-Closed-Incidents-and-Problems', '02-RCA-and-Corrective-Actions', '03-Trend-Review') }
    '07-Asset-and-Endpoint-Control' = @{ Current = @('01-Current-Asset-State', '02-Open-Exceptions-and-Gaps', '03-Encryption-and-Compliance-Views', '04-Current-Issue-and-Return-Control'); Year = @('01-Closed-Issue-and-Return', '02-Compliance-Reviews', '03-Snapshots-and-Evidence') }
    '08-Automation-Run-Logs' = @{ Current = @('01-Current-Run-Queue', '02-Open-Failures-and-Retries', '03-Current-Schedules-and-Owners'); Year = @('01-Closed-Run-Logs', '02-Failure-and-Recovery-History', '03-Review-and-Close') }
}

$sourceRootFolders = @('01-QMS-Portal', '02-Tai-Lieu-He-Thong', '03-Tai-Lieu-Van-Hanh', '04-Bieu-Mau', '10-Training-Academy', '11-Glossary', 'assets', 'core-standards', 'tools')
$releaseManifestFolders = @('01-Release-Baselines', '02-Approval-and-Manifest', '03-Release-Notes-and-Scope', '04-Point-of-Use-Verification')
$deployReceiptFolders = @('01-Pull-and-Deploy-Receipt', '02-Smoke-Test-and-Verification', '03-Rollback-and-Recovery', '04-Close-Out')
$reverseSyncFolders = @('01-Detection-and-Justification', '02-Commit-Back-and-Review', '03-Local-Pull-Confirmation', '04-Close-Out')
$partMasterRevFolders = @('01-Customer-Input-Baseline', '02-Controlled-Engineering-Baseline', '03-Released-Method-and-Setup-Baseline', '04-Inspection-and-Qualification-Baseline', '05-Supplier-and-Processor-Baseline', '06-Supersedure-and-Revision-Notes')
$templateZones = @('01-Document-and-Form-Templates', '02-Operational-Work-Aids-and-Visuals', '03-Label-and-Packing-Templates', '04-Engineering-and-Setup-Templates', '05-Import-Export-and-Data-Templates', '99-Superseded-and-Retired-Templates')

Ensure-Dir -Path $OutputRoot

$coreSite = Join-Path $OutputRoot 'HESEM-QMS-Core'
$peopleSite = Join-Path $OutputRoot 'HESEM-People-Restricted'
$digitalSite = Join-Path $OutputRoot 'HESEM-Digital-Control'

Ensure-Dir -Path $coreSite
Ensure-Dir -Path $peopleSite
Ensure-Dir -Path $digitalSite

$qmsYearZones = @('01-Management-Review', '02-Internal-Audits', '03-External-Audits-and-CB', '04-Risk-and-Opportunity', '05-Change-Control', '06-Document-Control-and-Issuance', '07-Communication-and-Leadership', '08-Context-and-Interested-Parties', '09-Continual-Improvement-and-Kaizen', '10-Contingency-and-Disruption', '11-Legal-and-Compliance', '14-KPI-and-Dashboard-Control')
$qmsStaticZones = @('12-Knowledge-and-Lessons-Learned', '13-Authority-RACI-Deputy')
$qmsRoot = Join-Path $coreSite '01-QMS-Records'
foreach ($zone in $qmsYearZones) {
    Ensure-Dir -Path (Join-Path (Join-Path $qmsRoot $zone) $yearFolder)
}
Ensure-ChildDirs -BasePath $qmsRoot -ChildNames $qmsStaticZones

$qualityZones = @('01-Quality-Planning', '02-Inspection-Execution', '03-Calibration-and-MSA', '04-NCR', '05-CAPA', '06-Customer-Complaints', '07-FAI-and-First-Piece', '08-SPC-and-Capability', '09-Product-Safety-and-FOD', '10-Ship-Release-and-CoC', '11-Supplier-Quality-and-SCAR', '12-Audit-and-MR-Quality-Inputs')
$qualityRoot = Join-Path $coreSite '02-Quality-Records'
foreach ($zone in $qualityZones) {
    Ensure-Dir -Path (Join-Path (Join-Path $qualityRoot $zone) $yearFolder)
}

$jobTemplateRoot = Join-Path (Join-Path (Join-Path (Join-Path $coreSite '03-Job-Dossiers') $yearFolder) '{CustomerID}') '{JobNum}-{PartNo}-REV-{Revision}'
Ensure-Dir -Path $jobTemplateRoot
foreach ($gate in $jobGateFolderMap.Keys) {
    $gateRoot = Join-Path $jobTemplateRoot $gate
    Ensure-Dir -Path $gateRoot
    Ensure-ChildDirs -BasePath $gateRoot -ChildNames $jobGateFolderMap[$gate]
}

$trainingRoot = Join-Path $coreSite '04-Training-Records'
foreach ($zoneName in $trainingZoneMap.Keys) {
    $zoneRoot = Join-Path $trainingRoot $zoneName
    $zoneSpec = $trainingZoneMap[$zoneName]
    if ($zoneSpec.Current.Count -eq 0 -and $zoneSpec.Year.Count -eq 0) {
        Ensure-Dir -Path $zoneRoot
        continue
    }
    Ensure-ZoneWithCurrentAndYear -ZoneRoot $zoneRoot -CurrentChildren $zoneSpec.Current -YearChildren $zoneSpec.Year
}
$deptRoot = Join-Path $coreSite '05-Department-Records'
foreach ($department in $departmentCatalog) {
    $departmentName = '{0}-{1}' -f $department.Code, $department.Name
    $departmentRoot = Join-Path $deptRoot $departmentName

    $liveControlRoot = Join-Path $departmentRoot '00-Live-Control-and-Master-Data'
    $governanceRoot = Join-Path $departmentRoot '01-Governance'
    $operationsRoot = Join-Path $departmentRoot '02-Operations'
    $logsRoot = Join-Path $departmentRoot '03-Registers-and-Logs'
    $projectsRoot = Join-Path $departmentRoot '04-Projects-and-Improvement'
    $interfacesRoot = Join-Path $departmentRoot '05-Interfaces-and-Released-Packs'
    $workingRoot = Join-Path $departmentRoot '06-Working-Transitory-and-Draft'
    $referenceRoot = Join-Path $departmentRoot '07-Reference-and-Received-External'
    $archiveRoot = Join-Path $departmentRoot '99-Archive'

    Ensure-Dir -Path $liveControlRoot
    Ensure-ChildDirs -BasePath $liveControlRoot -ChildNames $departmentLiveControlFolders
    Ensure-ZoneWithCurrentAndYear -ZoneRoot $governanceRoot -CurrentChildren $departmentGovernanceCurrentFolders -YearChildren $departmentGovernanceYearFolders
    Ensure-ZoneWithCurrentAndYear -ZoneRoot $operationsRoot
    Ensure-ZoneWithCurrentAndYear -ZoneRoot $logsRoot
    Ensure-ZoneWithActiveAndYear -ZoneRoot $projectsRoot -ActiveChildren $departmentProjectActiveFolders -YearChildren $departmentProjectYearFolders
    Ensure-ZoneWithCurrentAndYear -ZoneRoot $interfacesRoot

    Ensure-Dir -Path $workingRoot
    Ensure-Dir -Path $referenceRoot
    Ensure-Dir -Path $archiveRoot
    Ensure-ChildDirs -BasePath $referenceRoot -ChildNames $departmentReferenceFolders
    Ensure-ChildDirs -BasePath $archiveRoot -ChildNames $departmentArchiveFolders

    foreach ($role in $department.Roles) {
        $roleRoot = Join-Path $workingRoot $role
        Ensure-Dir -Path $roleRoot
        Ensure-ChildDirs -BasePath $roleRoot -ChildNames $departmentRoleTeamFolders

        $employeeWorkbenchRoot = Join-Path (Join-Path $roleRoot '90-Employee-WB') '{EmployeeID}-{DisplayName}'
        Ensure-Dir -Path $employeeWorkbenchRoot
        Ensure-ChildDirs -BasePath $employeeWorkbenchRoot -ChildNames $employeeWorkbenchFolders
    }

    foreach ($operation in $department.Operations) {
        $currentOperationRoot = Join-Path (Join-Path $operationsRoot '00-Current') $operation
        $yearOperationRoot = Join-Path (Join-Path $operationsRoot $yearFolder) $operation
        Ensure-Dir -Path $currentOperationRoot
        Ensure-Dir -Path $yearOperationRoot
        Ensure-ChildDirs -BasePath $currentOperationRoot -ChildNames $departmentOperationSubfolders
        Ensure-ChildDirs -BasePath $yearOperationRoot -ChildNames $departmentOperationSubfolders
    }

    foreach ($log in $department.Logs) {
        $currentLogRoot = Join-Path (Join-Path $logsRoot '00-Current') $log
        $yearLogRoot = Join-Path (Join-Path $logsRoot $yearFolder) $log
        Ensure-Dir -Path $currentLogRoot
        Ensure-Dir -Path $yearLogRoot
        Ensure-ChildDirs -BasePath $currentLogRoot -ChildNames $departmentLogSubfolders
        Ensure-ChildDirs -BasePath $yearLogRoot -ChildNames $departmentLogSubfolders
    }

    foreach ($interface in $department.Interfaces) {
        $currentInterfaceRoot = Join-Path (Join-Path $interfacesRoot '00-Current') $interface
        $yearInterfaceRoot = Join-Path (Join-Path $interfacesRoot $yearFolder) $interface
        Ensure-Dir -Path $currentInterfaceRoot
        Ensure-Dir -Path $yearInterfaceRoot
        Ensure-ChildDirs -BasePath $currentInterfaceRoot -ChildNames $departmentInterfaceSubfolders
        Ensure-ChildDirs -BasePath $yearInterfaceRoot -ChildNames $departmentInterfaceSubfolders
    }
}

$archiveRoot = Join-Path $coreSite '06-Archive'
Ensure-Dir -Path (Join-Path (Join-Path $archiveRoot '01-Closed-Year-Archive') $yearFolder)
Ensure-Dir -Path (Join-Path $archiveRoot '02-Superseded-and-Obsolete')
Ensure-Dir -Path (Join-Path $archiveRoot '03-Legal-Hold')
Ensure-Dir -Path (Join-Path (Join-Path $archiveRoot '04-Locked-Job-Packages') $yearFolder)
Ensure-Dir -Path (Join-Path $archiveRoot '05-Archive-Index-and-Retention-Control')

$templatesRoot = Join-Path $coreSite '07-Templates-Working'
Ensure-ChildDirs -BasePath $templatesRoot -ChildNames $templateZones
Ensure-Dir -Path (Join-Path (Join-Path $templatesRoot '{Function}') '{TemplateType}')

$partRoot = Join-Path $coreSite 'Part-REV-Master'
$partTemplateRoot = Join-Path (Join-Path (Join-Path $partRoot '{CustomerID}') '{PartNo}') 'REV-{Rev}'
Ensure-Dir -Path $partTemplateRoot
Ensure-ChildDirs -BasePath $partTemplateRoot -ChildNames $partMasterRevFolders

$peopleRoot = Join-Path $peopleSite '08-People-Records'
$activeEmployeeRoot = Join-Path (Join-Path $peopleRoot '01-Active-Employees') '{EmployeeID}-{FullName}'
$pendingStarterRoot = Join-Path (Join-Path (Join-Path (Join-Path $peopleRoot '02-Pending-Starters') $yearFolder) '{Population}') '{CandidateOrPersonID}-{Name}'
$formerEmployeeRoot = Join-Path (Join-Path (Join-Path $peopleRoot '03-Former-Employees') $yearFolder) '{EmployeeID}-{FullName}'
$contractorRoot = Join-Path (Join-Path (Join-Path (Join-Path $peopleRoot '04-Contractors-Interns-Temps') $yearFolder) '{Population}') '{ID-Name}'
$visitorRoot = Join-Path (Join-Path (Join-Path (Join-Path $peopleRoot '05-Visitors-and-Vendors') $yearFolder) '{VisitType}') '{VisitorName}'
$peopleSharedRoot = Join-Path $peopleRoot '06-Restricted-Shared-Ops'

Ensure-Dir -Path $activeEmployeeRoot
Ensure-Dir -Path $pendingStarterRoot
Ensure-Dir -Path $formerEmployeeRoot
Ensure-Dir -Path $contractorRoot
Ensure-Dir -Path $visitorRoot
Ensure-Dir -Path $peopleSharedRoot
Ensure-ChildDirs -BasePath $activeEmployeeRoot -ChildNames $personDossierFolders
Ensure-ChildDirs -BasePath $pendingStarterRoot -ChildNames $personDossierFolders
Ensure-ChildDirs -BasePath $formerEmployeeRoot -ChildNames $personDossierFolders
Ensure-ChildDirs -BasePath $contractorRoot -ChildNames $personDossierFolders
Ensure-ChildDirs -BasePath $visitorRoot -ChildNames $visitorDossierFolders

foreach ($zoneName in $peopleRestrictedSharedZones.Keys) {
    $zoneRoot = Join-Path $peopleSharedRoot $zoneName
    $zoneSpec = $peopleRestrictedSharedZones[$zoneName]
    Ensure-ZoneWithCurrentAndYear -ZoneRoot $zoneRoot -CurrentChildren $zoneSpec.Current -YearChildren $zoneSpec.Year
}

$systemRoot = Join-Path $digitalSite '09-Digital-System-Records'
foreach ($zoneName in $systemZoneMap.Keys) {
    $zoneRoot = Join-Path $systemRoot $zoneName
    $zoneSpec = $systemZoneMap[$zoneName]
    Ensure-ZoneWithCurrentAndYear -ZoneRoot $zoneRoot -CurrentChildren $zoneSpec.Current -YearChildren $zoneSpec.Year
}

$sourceRoot = Join-Path $digitalSite '10-QMS-Source-Control'
$controlledSourceRoot = Join-Path (Join-Path $sourceRoot '01-Controlled-Source') 'qms.hesem.com.vn'
$releaseManifestRoot = Join-Path (Join-Path $sourceRoot '02-Release-Manifests') $yearFolder
$deployReceiptRoot = Join-Path (Join-Path $sourceRoot '03-Server-Deploy-Receipts') $yearFolder
$reverseSyncRoot = Join-Path (Join-Path $sourceRoot '04-Reverse-Sync-Intake') $yearFolder

Ensure-Dir -Path $controlledSourceRoot
Ensure-ChildDirs -BasePath $controlledSourceRoot -ChildNames $sourceRootFolders
Ensure-Dir -Path $releaseManifestRoot
Ensure-ChildDirs -BasePath $releaseManifestRoot -ChildNames $releaseManifestFolders
Ensure-Dir -Path $deployReceiptRoot
Ensure-ChildDirs -BasePath $deployReceiptRoot -ChildNames $deployReceiptFolders
Ensure-Dir -Path $reverseSyncRoot
Ensure-ChildDirs -BasePath $reverseSyncRoot -ChildNames $reverseSyncFolders

Write-Output ('Created or verified folder template at: {0}' -f $OutputRoot)
