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

$yearFolder = [string]$Year

$departmentCatalog = @(
    @{
        Code = 'EXEC'
        Name = 'Executive'
        Roles = @(
            'ROLE-CEO',
            'ROLE-PDIR'
        )
        Operations = @(
            '01-Strategy-Deployment',
            '02-Management-Review-Inputs',
            '03-Board-and-Customer-Commitments',
            '04-Risk-and-Escalation'
        )
        Logs = @(
            '01-Objective-Tracking',
            '02-Decision-Log',
            '03-Action-Tracking',
            '04-Stakeholder-Commitments'
        )
        Interfaces = @(
            '01-Leadership-Communication',
            '02-Board-and-Management-Packs'
        )
    },
    @{
        Code = 'QMS'
        Name = 'Quality-Management-System'
        Roles = @(
            'ROLE-QMSE',
            'ROLE-IAO'
        )
        Operations = @(
            '01-Document-Control-Operations',
            '02-Change-Control-Coordination',
            '03-Management-System-Maintenance',
            '04-Improvement-Coordination'
        )
        Logs = @(
            '01-Document-Issue-Log',
            '02-Training-Effectiveness-Log',
            '03-System-Review-Log',
            '04-Retention-Review'
        )
        Interfaces = @(
            '01-Audit-Input-Packs',
            '02-MR-Input-Packs'
        )
    },
    @{
        Code = 'QA'
        Name = 'Quality-Assurance'
        Roles = @(
            'ROLE-QAM',
            'ROLE-QE',
            'ROLE-QCL',
            'ROLE-QCCMM',
            'ROLE-MCS'
        )
        Operations = @(
            '01-Incoming-and-In-Process-Control',
            '02-Final-Inspection-and-Release',
            '03-Calibration-Coordination',
            '04-Customer-Complaint-Response'
        )
        Logs = @(
            '01-Hold-Release-Log',
            '02-Gage-Status-Log',
            '03-Deviation-Reaction-Log',
            '04-Inspection-Coverage-Log'
        )
        Interfaces = @(
            '01-Customer-Complaint-Response',
            '02-Supplier-Quality-Pack'
        )
    },
    @{
        Code = 'ENG'
        Name = 'Engineering'
        Roles = @(
            'ROLE-ELM',
            'ROLE-DFM',
            'ROLE-PE',
            'ROLE-CAM'
        )
        Operations = @(
            '01-Feasibility-and-DFM',
            '02-CAM-and-Method-Release',
            '03-Tooling-and-Fixture-Control',
            '04-Technical-Change-Execution'
        )
        Logs = @(
            '01-Release-Queue',
            '02-Revision-Change-Log',
            '03-Fixture-Status-Log',
            '04-Programming-Error-Learnings'
        )
        Interfaces = @(
            '01-RFQ-Response-Pack',
            '02-Process-Readiness-Pack',
            '03-CAPA-Engineering-Response'
        )
    },
    @{
        Code = 'PRO'
        Name = 'Production'
        Roles = @(
            'ROLE-CWM',
            'ROLE-PPLN',
            'ROLE-PIE',
            'ROLE-SHFL',
            'ROLE-SET',
            'ROLE-CNC',
            'ROLE-DBTL',
            'ROLE-DBT',
            'ROLE-CPS',
            'ROLE-CPT',
            'ROLE-MNT'
        )
        Operations = @(
            '01-Dispatch-and-Readiness',
            '02-Setup-and-First-Piece',
            '03-Shift-Handover-and-WIP',
            '04-Secondary-Operations-and-Clean-Pack',
            '05-Tooling-Maintenance-and-Breakdown'
        )
        Logs = @(
            '01-Machine-History-Log',
            '02-Downtime-Log',
            '03-Shift-Handover-Log',
            '04-Tool-Life-Log',
            '05-Line-Clearance-Log'
        )
        Interfaces = @(
            '01-Readiness-Control-Tower',
            '02-Pack-Ready-Handover'
        )
    },
    @{
        Code = 'SCM'
        Name = 'Supply-Chain-Management'
        Roles = @(
            'ROLE-SCMM',
            'ROLE-BUY',
            'ROLE-WHC',
            'ROLE-TCR',
            'ROLE-LSC'
        )
        Operations = @(
            '01-Supplier-Qualification-and-Performance',
            '02-PO-and-Subcontract-Follow-Up',
            '03-Receiving-and-IQC-Handoff',
            '04-Warehouse-and-Traceability',
            '05-Shipping-and-Packing-Coordination'
        )
        Logs = @(
            '01-Expedite-Log',
            '02-Shortage-Risk-Log',
            '03-Receiving-Exception-Log',
            '04-Lot-Traceability-Log',
            '05-Carrier-Performance-Log'
        )
        Interfaces = @(
            '01-Processor-Flowdown-Pack',
            '02-Ship-Pack-Interface',
            '03-SCAR-Response-Pack'
        )
    },
    @{
        Code = 'SAL'
        Name = 'Sales-and-Customer-Service'
        Roles = @(
            'ROLE-CS',
            'ROLE-EST'
        )
        Operations = @(
            '01-RFQ-and-Quote-Pack',
            '02-Contract-Review-and-Order-Ack',
            '03-Customer-Change-and-Escalation',
            '04-Complaint-and-RMA-Coordination'
        )
        Logs = @(
            '01-Quote-Lead-Time-Log',
            '02-Commitment-Change-Log',
            '03-Customer-Communication-Log',
            '04-RMA-Tracking'
        )
        Interfaces = @(
            '01-Order-Release-Pack',
            '02-Customer-Communication-Pack'
        )
    },
    @{
        Code = 'FIN'
        Name = 'Finance'
        Roles = @(
            'ROLE-FM',
            'ROLE-APAR',
            'ROLE-GLPAY'
        )
        Operations = @(
            '01-Invoice-Pack-and-AR',
            '02-AP-and-Payment-Proposal',
            '03-Job-Costing-and-Margin',
            '04-Period-Close-and-Reconciliation',
            '05-Tax-and-Statutory-Submission'
        )
        Logs = @(
            '01-Collection-Log',
            '02-Payment-Release-Log',
            '03-Close-Issue-Log',
            '04-Cash-Forecast-Log',
            '05-Financial-Control-Review'
        )
        Interfaces = @(
            '01-Invoice-Pack-Interface',
            '02-Payroll-Input-Receipt',
            '03-Costing-Review-Packs'
        )
    },
    @{
        Code = 'HR'
        Name = 'Human-Resources'
        Roles = @(
            'ROLE-HRM'
        )
        Operations = @(
            '01-Manpower-and-Recruitment',
            '02-Onboarding-and-Induction',
            '03-Performance-and-Probation',
            '04-Employee-Relations-and-Discipline',
            '05-Offboarding-and-Revocation'
        )
        Logs = @(
            '01-Headcount-Log',
            '02-Recruitment-Funnel-Log',
            '03-Leave-and-Attendance-Interface',
            '04-Asset-Return-Tracking',
            '05-Access-Revocation-Tracking'
        )
        Interfaces = @(
            '01-Access-Request-Pack',
            '02-Payroll-Input-Pack',
            '03-Disciplinary-and-Grievance-Pack'
        )
    },
    @{
        Code = 'EHS'
        Name = 'Environment-Health-and-Safety'
        Roles = @(
            'ROLE-EHS'
        )
        Operations = @(
            '01-Risk-and-Hazard-Control',
            '02-Permit-and-PPE-Control',
            '03-Incident-and-Near-Miss-Response',
            '04-Emergency-Preparedness',
            '05-Environmental-Monitoring'
        )
        Logs = @(
            '01-Incident-Log',
            '02-Unsafe-Condition-Log',
            '03-PPE-Issue-Log',
            '04-Inspection-Log',
            '05-Waste-and-Environment-Log'
        )
        Interfaces = @(
            '01-Restart-Release-Pack',
            '02-EHS-MR-Input-Pack'
        )
    },
    @{
        Code = 'IT'
        Name = 'Information-Technology'
        Roles = @(
            'ROLE-ITA'
        )
        Operations = @(
            '01-Service-Request-and-Endpoint',
            '02-Identity-and-Access-Coordination',
            '03-M365-Configuration-Change',
            '04-Backup-Restore-and-Recovery',
            '05-Security-and-Incident-Response'
        )
        Logs = @(
            '01-Ticket-Log',
            '02-Asset-Compliance-Log',
            '03-Backup-Job-Exception-Log',
            '04-Access-Review-Tracker',
            '05-Security-Issue-Log'
        )
        Interfaces = @(
            '01-Deployment-Packs',
            '02-Recovery-Packs'
        )
    },
    @{
        Code = 'ERP'
        Name = 'ERP-Administration'
        Roles = @(
            'ROLE-ERPA'
        )
        Operations = @(
            '01-Role-and-Access-Governance',
            '02-Master-Data-Control',
            '03-UAT-Deployment-and-Cutover',
            '04-Transaction-Error-and-Recovery',
            '05-Report-and-Interface-Control'
        )
        Logs = @(
            '01-SoD-Review-Log',
            '02-Master-Data-Change-Tracker',
            '03-Deployment-Calendar',
            '04-Error-Reentry-Log',
            '05-Integration-Monitoring-Log'
        )
        Interfaces = @(
            '01-UAT-Pack',
            '02-Cutover-Pack',
            '03-Reconciliation-Pack'
        )
    }
)

$personDossierFolders = @(
    '00-Personnel-Profile',
    '01-Contract-and-Legal',
    '02-Onboarding-and-Access',
    '03-Training-and-Certification-Link',
    '04-Performance-and-Probation',
    '05-Compensation-and-Payroll-Restricted',
    '06-Health-PPE-and-Fit-to-Work-Restricted',
    '07-Discipline-and-Grievance-Restricted',
    '08-Assets-and-Issued-Items',
    '09-Offboarding-and-Handover'
)

$departmentLiveControlFolders = @(
    '01-Current-Boards-and-Queues',
    '02-Master-Lists-and-Mappings',
    '03-Live-Dashboards-and-Source-Views',
    '04-Open-Issues-and-Action-Trackers',
    '05-Link-Indexes-and-Controlled-Views'
)

$departmentGovernanceCurrentFolders = @(
    '01-Org-and-Responsibility',
    '02-Objective-and-KPI-Control',
    '03-Meeting-and-Review-Cadence',
    '04-Risk-and-Escalation-Current',
    '05-Controlled-Reference-Link-Index'
)

$departmentGovernanceYearFolders = @(
    '01-Department-Review-Packs',
    '02-Objective-and-KPI-Reviews',
    '03-Risk-and-Escalation-History',
    '04-Compliance-and-Review-Outputs'
)

$departmentProjectActiveFolders = @(
    '01-Improvement-Backlog',
    '02-Active-Projects',
    '03-Open-Actions-and-Benefits-Tracking'
)

$departmentProjectYearFolders = @(
    '01-Closed-Projects',
    '02-Improvement-Closures',
    '03-Benefit-Verification-History'
)

$departmentOperationSubfolders = @(
    '01-Inputs-and-Requests',
    '02-Working-Control',
    '03-Issued-Outputs',
    '04-Photos-External-Evidence-and-Exports',
    '05-Follow-Up-and-Closure'
)

$departmentLogSubfolders = @(
    '01-Live-Register',
    '02-Supporting-Evidence',
    '03-Review-and-Close'
)

$departmentInterfaceSubfolders = @(
    '01-Outgoing-Released',
    '02-Returned-Acknowledgements',
    '03-Reissue-and-Change-History'
)

$departmentRoleWorkbenchFolders = @(
    '00-Inbox',
    '01-Draft',
    '02-Review',
    '03-Promote-to-Official-Record',
    '99-Clear-Within-90d'
)

$departmentReferenceFolders = @(
    '01-Customer-Received',
    '02-Supplier-Received',
    '03-Standards-and-Manuals',
    '04-Convenience-Copies',
    '05-To-Be-Culled'
)

$jobGateFolderMap = [ordered]@{
    '00_Admin-Control' = @(
        '01-Job-Index',
        '02-Approvals-and-Status',
        '03-Change-History',
        '04-Customer-Requirement-Summary',
        '05-Link-to-Part-Master'
    )
    '01_G0-Contract-Kickoff' = @(
        '01-RFQ-and-Quote-Inputs',
        '02-Contract-Review-and-PO',
        '03-Kickoff-and-Planning',
        '04-Customer-Change-Inputs',
        '05-Customer-Property-and-Consigned'
    )
    '02_G1-Setup-Release' = @(
        '01-Router-and-Traveler',
        '02-Setup-Sheets-and-Tool-Lists',
        '03-Program-and-Method-Links',
        '04-Gage-and-Fixture-Readiness',
        '05-Pre-Run-and-Work-Transfer'
    )
    '03_G2-FAI-First-Piece' = @(
        '01-FAI-Request-and-Plan',
        '02-Ballooned-Drawing',
        '03-Raw-Measurement-Data',
        '04-Photos-and-Deviations',
        '05-Release-Decision'
    )
    '04_G3-IPQC-Production' = @(
        '01-Traveler-and-Operation-Evidence',
        '02-IPQC-AQL-SPC',
        '03-WIP-Hold-Restart',
        '04-Tool-Life-and-Downtime',
        '05-Outsource-and-Receiving-Handoff'
    )
    '05_G4-Final-QC-Packaging' = @(
        '01-Final-Inspection-and-CoC-Draft',
        '02-Packaging-and-Clean-Pack',
        '03-Labels-and-SSCC-Staging',
        '04-Photos-and-Preservation',
        '05-Release-Handoff'
    )
    '06_G5-Ship-Release' = @(
        '01-Ship-Release-Approval',
        '02-Packing-List-and-Labels',
        '03-Carrier-and-POD',
        '04-Customer-Shipment-Pack',
        '05-Invoice-Interface-Snapshot'
    )
    '07_NCR-CAPA-Deviation' = @(
        '01-NCR',
        '02-Concession-Waiver',
        '03-Rework-and-Reinspection',
        '04-CAPA-8D',
        '05-Customer-Deviation-Approval'
    )
    '99_Archive-Locked' = @(
        '01-Final-Evidence-Index',
        '02-Sealed-Export-Pack',
        '03-Archive-Note'
    )
}

Ensure-Dir -Path $OutputRoot

$coreSite = Join-Path $OutputRoot 'HESEM-QMS-Core'
$peopleSite = Join-Path $OutputRoot 'HESEM-People-Restricted'
$digitalSite = Join-Path $OutputRoot 'HESEM-Digital-Control'

Ensure-Dir -Path $coreSite
Ensure-Dir -Path $peopleSite
Ensure-Dir -Path $digitalSite

# 01-QMS-Records
$qmsYearZones = @(
    '01-Management-Review',
    '02-Internal-Audits',
    '03-External-Audits-and-CB',
    '04-Risk-and-Opportunity',
    '05-Change-Control',
    '06-Document-Control-and-Issuance',
    '07-Communication-and-Leadership',
    '08-Context-and-Interested-Parties',
    '09-Continual-Improvement-and-Kaizen',
    '10-Contingency-and-Disruption',
    '11-Legal-and-Compliance',
    '14-KPI-and-Dashboard-Control'
)
$qmsStaticZones = @(
    '12-Knowledge-and-Lessons-Learned',
    '13-Authority-RACI-Deputy'
)
$qmsRoot = Join-Path $coreSite '01-QMS-Records'
foreach ($zone in $qmsYearZones) {
    Ensure-Dir -Path (Join-Path (Join-Path $qmsRoot $zone) $yearFolder)
}
Ensure-ChildDirs -BasePath $qmsRoot -ChildNames $qmsStaticZones

# 02-Quality-Records
$qualityZones = @(
    '01-Quality-Planning',
    '02-Inspection-Execution',
    '03-Calibration-and-MSA',
    '04-NCR',
    '05-CAPA',
    '06-Customer-Complaints',
    '07-FAI-and-First-Piece',
    '08-SPC-and-Capability',
    '09-Product-Safety-and-FOD',
    '10-Ship-Release-and-CoC',
    '11-Supplier-Quality-and-SCAR',
    '12-Audit-and-MR-Quality-Inputs'
)
$qualityRoot = Join-Path $coreSite '02-Quality-Records'
foreach ($zone in $qualityZones) {
    Ensure-Dir -Path (Join-Path (Join-Path $qualityRoot $zone) $yearFolder)
}

# 03-Job-Dossiers
$jobTemplateRoot = Join-Path (Join-Path (Join-Path $coreSite '03-Job-Dossiers') $yearFolder) '{JobNum}-{PartNo}-REV-{Revision}'
Ensure-Dir -Path $jobTemplateRoot
foreach ($gate in $jobGateFolderMap.Keys) {
    $gateRoot = Join-Path $jobTemplateRoot $gate
    Ensure-Dir -Path $gateRoot
    Ensure-ChildDirs -BasePath $gateRoot -ChildNames $jobGateFolderMap[$gate]
}

# 04-Training-Records
$trainingYearZones = @(
    '01-Training-Plans',
    '02-Attendance-and-Class-Records',
    '03-OJT-Evidence',
    '04-Competence-Assessments',
    '05-Certification-Register',
    '06-Skill-Matrix-and-Coverage',
    '08-Safety-Induction-and-Special-Briefings'
)
$trainingStaticZones = @(
    '07-Academy-Content-Control'
)
$trainingRoot = Join-Path $coreSite '04-Training-Records'
foreach ($zone in $trainingYearZones) {
    Ensure-Dir -Path (Join-Path (Join-Path $trainingRoot $zone) $yearFolder)
}
Ensure-ChildDirs -BasePath $trainingRoot -ChildNames $trainingStaticZones

# 05-Department-Records
$deptRoot = Join-Path $coreSite '05-Department-Records'
foreach ($department in $departmentCatalog) {
    $departmentName = '{0}-{1}' -f $department.Code, $department.Name
    $departmentRoot = Join-Path $deptRoot $departmentName

    $liveControlRoot = Join-Path $departmentRoot '00-Live-Control-and-Master-Data'
    $governanceCurrentRoot = Join-Path $departmentRoot '01-Governance\00-Current'
    $governanceYearRoot = Join-Path $departmentRoot ("01-Governance\{0}" -f $yearFolder)
    $operationsCurrentRoot = Join-Path $departmentRoot '02-Operations\00-Current'
    $operationsYearRoot = Join-Path $departmentRoot ("02-Operations\{0}" -f $yearFolder)
    $logsCurrentRoot = Join-Path $departmentRoot '03-Registers-and-Logs\00-Current'
    $logsYearRoot = Join-Path $departmentRoot ("03-Registers-and-Logs\{0}" -f $yearFolder)
    $projectsActiveRoot = Join-Path $departmentRoot '04-Projects-and-Improvement\00-Active'
    $projectsYearRoot = Join-Path $departmentRoot ("04-Projects-and-Improvement\{0}" -f $yearFolder)
    $interfacesCurrentRoot = Join-Path $departmentRoot '05-Interfaces-and-Released-Packs\00-Current'
    $interfacesYearRoot = Join-Path $departmentRoot ("05-Interfaces-and-Released-Packs\{0}" -f $yearFolder)
    $workingRoot = Join-Path $departmentRoot '06-Working-Transitory-and-Draft'
    $referenceRoot = Join-Path $departmentRoot '07-Reference-and-Received-External'
    $archiveRoot = Join-Path $departmentRoot '99-Archive'

    Ensure-Dir -Path $liveControlRoot
    Ensure-Dir -Path $governanceCurrentRoot
    Ensure-Dir -Path $governanceYearRoot
    Ensure-Dir -Path $operationsCurrentRoot
    Ensure-Dir -Path $operationsYearRoot
    Ensure-Dir -Path $logsCurrentRoot
    Ensure-Dir -Path $logsYearRoot
    Ensure-Dir -Path $projectsActiveRoot
    Ensure-Dir -Path $projectsYearRoot
    Ensure-Dir -Path $interfacesCurrentRoot
    Ensure-Dir -Path $interfacesYearRoot
    Ensure-Dir -Path $workingRoot
    Ensure-Dir -Path $referenceRoot
    Ensure-Dir -Path $archiveRoot

    Ensure-ChildDirs -BasePath $liveControlRoot -ChildNames $departmentLiveControlFolders
    Ensure-ChildDirs -BasePath $governanceCurrentRoot -ChildNames $departmentGovernanceCurrentFolders
    Ensure-ChildDirs -BasePath $governanceYearRoot -ChildNames $departmentGovernanceYearFolders
    Ensure-ChildDirs -BasePath $projectsActiveRoot -ChildNames $departmentProjectActiveFolders
    Ensure-ChildDirs -BasePath $projectsYearRoot -ChildNames $departmentProjectYearFolders
    Ensure-ChildDirs -BasePath $referenceRoot -ChildNames $departmentReferenceFolders

    foreach ($role in $department.Roles) {
        $roleRoot = Join-Path $workingRoot $role
        Ensure-Dir -Path $roleRoot
        Ensure-ChildDirs -BasePath $roleRoot -ChildNames $departmentRoleWorkbenchFolders
    }

    foreach ($operation in $department.Operations) {
        $currentOperationRoot = Join-Path $operationsCurrentRoot $operation
        $yearOperationRoot = Join-Path $operationsYearRoot $operation

        Ensure-Dir -Path $currentOperationRoot
        Ensure-Dir -Path $yearOperationRoot
        Ensure-ChildDirs -BasePath $currentOperationRoot -ChildNames $departmentOperationSubfolders
        Ensure-ChildDirs -BasePath $yearOperationRoot -ChildNames $departmentOperationSubfolders
    }

    foreach ($log in $department.Logs) {
        $currentLogRoot = Join-Path $logsCurrentRoot $log
        $yearLogRoot = Join-Path $logsYearRoot $log

        Ensure-Dir -Path $currentLogRoot
        Ensure-Dir -Path $yearLogRoot
        Ensure-ChildDirs -BasePath $currentLogRoot -ChildNames $departmentLogSubfolders
        Ensure-ChildDirs -BasePath $yearLogRoot -ChildNames $departmentLogSubfolders
    }

    foreach ($interface in $department.Interfaces) {
        $currentInterfaceRoot = Join-Path $interfacesCurrentRoot $interface
        $yearInterfaceRoot = Join-Path $interfacesYearRoot $interface

        Ensure-Dir -Path $currentInterfaceRoot
        Ensure-Dir -Path $yearInterfaceRoot
        Ensure-ChildDirs -BasePath $currentInterfaceRoot -ChildNames $departmentInterfaceSubfolders
        Ensure-ChildDirs -BasePath $yearInterfaceRoot -ChildNames $departmentInterfaceSubfolders
    }
}

# 06-Archive
$archiveRoot = Join-Path $coreSite '06-Archive'
Ensure-Dir -Path (Join-Path (Join-Path $archiveRoot '01-Closed-Year-Archive') $yearFolder)
Ensure-Dir -Path (Join-Path $archiveRoot '02-Superseded-and-Obsolete')
Ensure-Dir -Path (Join-Path $archiveRoot '03-Legal-Hold')
Ensure-Dir -Path (Join-Path (Join-Path $archiveRoot '04-Locked-Job-Packages') $yearFolder)

# 07-Templates-Working
$templatesRoot = Join-Path $coreSite '07-Templates-Working'
Ensure-Dir -Path (Join-Path (Join-Path $templatesRoot '{Function}') '{TemplateType}')

# Part-REV-Master
$partRoot = Join-Path $coreSite 'Part-REV-Master'
Ensure-Dir -Path (Join-Path (Join-Path (Join-Path $partRoot '{CustomerID}') '{PartNo}') 'REV-{Rev}')

# 08-People-Records
$peopleRoot = Join-Path $peopleSite '08-People-Records'
$activeEmployeeRoot = Join-Path (Join-Path $peopleRoot '01-Active-Employees') '{EmployeeID}-{FullName}'
$formerEmployeeRoot = Join-Path (Join-Path (Join-Path $peopleRoot '02-Former-Employees') $yearFolder) '{EmployeeID}-{FullName}'
$contractorRoot = Join-Path (Join-Path (Join-Path (Join-Path $peopleRoot '03-Contractors-and-Interns') $yearFolder) '{Population}') '{ID-Name}'
$visitorRoot = Join-Path (Join-Path (Join-Path (Join-Path $peopleRoot '04-Visitors-and-Temporary-Access') $yearFolder) '{VisitType}') '{VisitorName}'

Ensure-Dir -Path $activeEmployeeRoot
Ensure-Dir -Path $formerEmployeeRoot
Ensure-Dir -Path $contractorRoot
Ensure-Dir -Path $visitorRoot

Ensure-ChildDirs -BasePath $activeEmployeeRoot -ChildNames $personDossierFolders
Ensure-ChildDirs -BasePath $formerEmployeeRoot -ChildNames $personDossierFolders
Ensure-ChildDirs -BasePath $contractorRoot -ChildNames $personDossierFolders

# 09-Digital-System-Records
$systemZones = @(
    '01-Access-and-Identity',
    '02-M365-and-SharePoint-Config',
    '03-Epicor-Master-Data-and-Role-Control',
    '04-Deployment-UAT-Cutover',
    '05-Backup-Restore-and-Recovery',
    '06-Incident-and-Problem-Management',
    '07-Asset-and-Endpoint-Control',
    '08-Automation-Run-Logs'
)
$systemRoot = Join-Path $digitalSite '09-Digital-System-Records'
foreach ($zone in $systemZones) {
    Ensure-Dir -Path (Join-Path (Join-Path $systemRoot $zone) $yearFolder)
}

Write-Output ('Created or verified folder template at: {0}' -f $OutputRoot)
