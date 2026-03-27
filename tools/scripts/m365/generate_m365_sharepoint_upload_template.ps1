<#
.SYNOPSIS
    HESEM QMS -SharePoint 4-Site Folder Template Generator
    Matches core-standards/14-m365-sharepoint-architecture.md

.DESCRIPTION
    Creates the local folder template for 4 SharePoint sites:
      SITE 1: HESEM-Records        -Operational records (forms, evidence, NOT job-tied)
      SITE 2: HESEM-Job-Evidence   -Job dossiers + Part baseline + Customer IP (SEPARATE)
      SITE 3: HESEM-People         -HR restricted
      SITE 4: HESEM-Digital        -IT governance + Source control backup

    Architecture principles (from core-standard 14):
      1. Web portal = read, SharePoint = store/backup
      2. Site = security boundary (separate by sensitivity)
      3. Flat folder + metadata: max 3 folder levels, use metadata columns
      4. OneDrive for personal files (no Employee Workbench in SharePoint)
      5. Group-based permissions via Entra ID Security Groups

.PARAMETER OutputRoot
    Root directory for the generated template. Default: ./M365-SharePoint-Upload-Template-Operational

.PARAMETER Year
    Current operational year for {YYYY} folders. Default: current year.

.EXAMPLE
    .\generate_m365_sharepoint_upload_template.ps1
    .\generate_m365_sharepoint_upload_template.ps1 -OutputRoot "D:\SharePoint-Template" -Year 2026
#>

param(
    [string]$OutputRoot = (Join-Path (Get-Location) 'M365-SharePoint-Upload-Template-Operational'),
    [int]$Year = (Get-Date).Year
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------
# HELPER FUNCTIONS
# ---------------------------------------------------------------

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

function Ensure-YearZone {
    param(
        [string]$ZoneRoot,
        [string[]]$SubFolders = @()
    )
    $yearPath = Join-Path $ZoneRoot $yearFolder
    Ensure-Dir -Path $yearPath
    if ($SubFolders.Count -gt 0) {
        Ensure-ChildDirs -BasePath $yearPath -ChildNames $SubFolders
    }
}

function Ensure-CurrentAndYear {
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

# ---------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------

$yearFolder = [string]$Year

# Department codes for Department-Ops library
$departments = @('EXEC', 'QMS', 'QA', 'ENG', 'PRO', 'SCM', 'SAL', 'FIN', 'HR', 'EHS', 'IT', 'ERP')

# Job gate folders (ANNEX-135 / cnc-job-order-reference-model)
$jobGates = @(
    '00_Admin-Control',
    '01_G0-Contract-Kickoff',
    '02_G1-Engineering-Release',
    '03_G2-IQC-Receiving',
    '04_G3-Setup-Release',
    '05_G4-FAI-First-Piece',
    '06_G5-IPQC-Production',
    '07_G6-Final-QC-Packaging',
    '08_G7-Ship-Release',
    '09_NCR-CAPA-Deviation',
    '99_Archive-Locked'
)

# Part-REV-Master sub-folders
$partRevSubFolders = @(
    '01-Customer-Input-Baseline',
    '02-Controlled-Engineering-Baseline',
    '03-Released-Method-and-Setup-Baseline',
    '04-Inspection-and-Qualification-Baseline',
    '05-Supplier-and-Processor-Baseline',
    '06-Supersedure-and-Revision-Notes'
)

# Person dossier folders (HESEM-People)
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

# Source control top-level folders (Digital site)
$sourceRootFolders = @(
    '01-QMS-Portal', '02-Tai-Lieu-He-Thong', '03-Tai-Lieu-Van-Hanh',
    '04-Bieu-Mau', '10-Training-Academy', '11-Glossary',
    'assets', 'core-standards', 'tools'
)

# ---------------------------------------------------------------
# CREATE ROOT + 4 SITES
# ---------------------------------------------------------------

Ensure-Dir -Path $OutputRoot

$recordsSite    = Join-Path $OutputRoot 'HESEM-Records'
$jobSite        = Join-Path $OutputRoot 'HESEM-Job-Evidence'
$peopleSite     = Join-Path $OutputRoot 'HESEM-People'
$digitalSite    = Join-Path $OutputRoot 'HESEM-Digital'

Ensure-Dir -Path $recordsSite
Ensure-Dir -Path $jobSite
Ensure-Dir -Path $peopleSite
Ensure-Dir -Path $digitalSite

# ---------------------------------------------------------------
# SITE 1: HESEM-Records -Operational records (non-job)
# Structure: {Library}/{YYYY}/{RecordType}/ (max 3 levels)
# ---------------------------------------------------------------

Write-Host '[SITE 1] HESEM-Records -Operational records' -ForegroundColor Cyan

# --- Quality-Records ---
$qualityRoot = Join-Path $recordsSite 'Quality-Records'
$qualityTypes = @('NCR', 'CAPA', 'FAI', 'Calibration', 'SPC', 'IQC', 'Customer-Complaints', 'Ship-Release', 'Supplier-Quality')
$qualityYearRoot = Join-Path $qualityRoot $yearFolder
Ensure-Dir -Path $qualityYearRoot
Ensure-ChildDirs -BasePath $qualityYearRoot -ChildNames $qualityTypes

# --- QMS-Governance ---
$qmsRoot = Join-Path $recordsSite 'QMS-Governance'
$qmsTypes = @('Management-Review', 'Internal-Audit', 'External-Audit', 'Risk-and-Opportunity', 'Change-Control', 'Document-Control', 'KPI-and-Dashboard', 'Continual-Improvement', 'Communication', 'Context-and-Interested-Parties', 'Legal-Compliance', 'Knowledge-and-Lessons', 'Contingency')
$qmsYearRoot = Join-Path $qmsRoot $yearFolder
Ensure-Dir -Path $qmsYearRoot
Ensure-ChildDirs -BasePath $qmsYearRoot -ChildNames $qmsTypes

# --- Training-Records ---
$trainingRoot = Join-Path $recordsSite 'Training-Records'
$trainingTypes = @('Attendance', 'OJT', 'Assessment', 'Certification', 'Safety-Induction')
$trainingYearRoot = Join-Path $trainingRoot $yearFolder
Ensure-Dir -Path $trainingYearRoot
Ensure-ChildDirs -BasePath $trainingYearRoot -ChildNames $trainingTypes
# Skill-Matrix is current-state (no year split)
Ensure-Dir -Path (Join-Path $trainingRoot 'Skill-Matrix')

# --- Department-Ops ---
$deptOpsRoot = Join-Path $recordsSite 'Department-Ops'
foreach ($dept in $departments) {
    # {DeptCode}/00-Current/ and {DeptCode}/{YYYY}/
    $deptRoot = Join-Path $deptOpsRoot $dept
    Ensure-Dir -Path (Join-Path $deptRoot '00-Current')
    Ensure-Dir -Path (Join-Path $deptRoot $yearFolder)
}

# ---------------------------------------------------------------
# SITE 2: HESEM-Job-Evidence -Job dossier + IP (SEPARATED)
# External sharing: OFF. Contains customer IP.
# ---------------------------------------------------------------

Write-Host '[SITE 2] HESEM-Job-Evidence -Job dossiers + Customer IP' -ForegroundColor Cyan

# --- Part-REV-Master ---
# Structure: {CustomerID}/{PartNum}/REV-{X}/  (template with placeholders)
$partRoot = Join-Path $jobSite 'Part-REV-Master'
$partTemplate = Join-Path (Join-Path (Join-Path $partRoot '{CustomerID}') '{PartNum}') 'REV-{Rev}'
Ensure-Dir -Path $partTemplate
Ensure-ChildDirs -BasePath $partTemplate -ChildNames $partRevSubFolders

# --- Job-Dossiers ---
# Structure: {YYYY}/{JobNum}_{PartRev}/ with gate folders inside
$jobDossierRoot = Join-Path $jobSite 'Job-Dossiers'
$jobTemplate = Join-Path (Join-Path $jobDossierRoot $yearFolder) '{JobNum}_{PartRev}'
Ensure-Dir -Path $jobTemplate
Ensure-ChildDirs -BasePath $jobTemplate -ChildNames $jobGates

# --- Customer-Received ---
# Structure: {CustomerID}/{DocType}/
$custRecvRoot = Join-Path $jobSite 'Customer-Received'
$custTemplate = Join-Path $custRecvRoot '{CustomerID}'
Ensure-ChildDirs -BasePath $custTemplate -ChildNames @('Drawings', 'Specs', 'Quality-Requirements', 'PO-and-Contracts', 'Change-Notices')

# --- Tooling-Fixture-Gage ---
# Structure: {AssetType}/{AssetID}/
$toolingRoot = Join-Path $jobSite 'Tooling-Fixture-Gage'
$assetTypes = @('FIX', 'GAGE', 'TOOL-HOLDER', 'JIG', 'COLLET', 'JAW', 'CLAMP')
foreach ($at in $assetTypes) {
    Ensure-Dir -Path (Join-Path (Join-Path $toolingRoot $at) '{AssetID}')
}

# ---------------------------------------------------------------
# SITE 3: HESEM-People -HR restricted
# Access: HR group only. External sharing: OFF.
# ---------------------------------------------------------------

Write-Host '[SITE 3] HESEM-People -HR restricted' -ForegroundColor Cyan

# --- Employee-Records ---
$empRoot = Join-Path $peopleSite 'Employee-Records'

# Active employees template
$activeEmpRoot = Join-Path (Join-Path $empRoot 'Active') '{EmpID}-{Name}'
Ensure-Dir -Path $activeEmpRoot
Ensure-ChildDirs -BasePath $activeEmpRoot -ChildNames $personDossierFolders

# Former employees (by year)
$formerEmpRoot = Join-Path (Join-Path (Join-Path $empRoot 'Former') $yearFolder) '{EmpID}-{Name}'
Ensure-Dir -Path $formerEmpRoot
Ensure-ChildDirs -BasePath $formerEmpRoot -ChildNames $personDossierFolders

# Contractors by year
$contractorRoot = Join-Path (Join-Path (Join-Path $empRoot 'Contractors') $yearFolder) '{ID}-{Name}'
Ensure-Dir -Path $contractorRoot

# --- HR-Operations ---
$hrOpsRoot = Join-Path $peopleSite 'HR-Operations'
$hrTypes = @('Recruitment', 'Payroll', 'Leave-and-Attendance', 'Onboarding', 'Offboarding', 'Discipline')
$hrYearRoot = Join-Path $hrOpsRoot $yearFolder
Ensure-Dir -Path $hrYearRoot
Ensure-ChildDirs -BasePath $hrYearRoot -ChildNames $hrTypes

# ---------------------------------------------------------------
# SITE 4: HESEM-Digital -IT governance + Source control
# ---------------------------------------------------------------

Write-Host '[SITE 4] HESEM-Digital -IT + Source Control' -ForegroundColor Cyan

# --- System-Records ---
$sysRoot = Join-Path $digitalSite 'System-Records'
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
foreach ($zone in $systemZones) {
    $zoneRoot = Join-Path $sysRoot $zone
    Ensure-Dir -Path (Join-Path $zoneRoot '00-Current')
    Ensure-Dir -Path (Join-Path $zoneRoot $yearFolder)
}

# --- QMS-Source-Control ---
$sourceRoot = Join-Path $digitalSite 'QMS-Source-Control'
# Controlled source (backup of web portal)
$controlledRoot = Join-Path (Join-Path $sourceRoot '01-Controlled-Source') 'qms.hesem.com.vn'
Ensure-Dir -Path $controlledRoot
Ensure-ChildDirs -BasePath $controlledRoot -ChildNames $sourceRootFolders

# Release Manifests / Deploy Receipts / Reverse Sync (by year)
$releaseRoot = Join-Path (Join-Path $sourceRoot '02-Release-Manifests') $yearFolder
$deployRoot = Join-Path (Join-Path $sourceRoot '03-Server-Deploy-Receipts') $yearFolder
$syncRoot = Join-Path (Join-Path $sourceRoot '04-Reverse-Sync-Intake') $yearFolder
Ensure-Dir -Path $releaseRoot
Ensure-Dir -Path $deployRoot
Ensure-Dir -Path $syncRoot

# ---------------------------------------------------------------
# README FILE
# ---------------------------------------------------------------

$readmeLines = @(
    'HESEM QMS - SharePoint 4-Site Folder Template',
    ('Generated: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')),
    ('Year: ' + $yearFolder),
    '',
    'Architecture: core-standards/14-m365-sharepoint-architecture.md',
    'Naming:       core-standards/15-evidence-and-records-naming.md',
    'ANNEX:        ANNEX-137 (Evidence and Records Naming Convention)',
    '',
    'SITES:',
    '  HESEM-Records        Site 1: Operational records (Quality, QMS, Training, Department)',
    '  HESEM-Job-Evidence   Site 2: Job dossiers + Part baseline + Customer IP (TACH RIENG)',
    '  HESEM-People         Site 3: HR restricted (Employee records, HR operations)',
    '  HESEM-Digital        Site 4: IT governance + Source control backup',
    '',
    'RULES:',
    '  - Max 3 folder levels. Use SharePoint metadata columns for filtering.',
    '  - Placeholders: {CustomerID}, {PartNum}, {JobNum}, {EmpID} - replace when creating actual.',
    '  - External sharing OFF on HESEM-Job-Evidence and HESEM-People.',
    '  - Employee personal files go to OneDrive, NOT SharePoint.',
    '  - Form blanks served from web portal. SharePoint stores FILLED forms + evidence only.',
    '',
    'PERMISSIONS (Entra ID Groups):',
    '  HESEM-Records:       AllStaff (read), Dept Groups (edit own dept)',
    '  HESEM-Job-Evidence:  Job-Core = ENG+QA+PRO+SCM (read+edit), Ext Sharing OFF',
    '  HESEM-People:        HR only',
    '  HESEM-Digital:       IT + QMS-Team'
)

Set-Content -Path (Join-Path $OutputRoot '00-READ-ME-FIRST.txt') -Value ($readmeLines -join "`r`n") -Encoding UTF8

# ---------------------------------------------------------------
# SUMMARY
# ---------------------------------------------------------------

$dirCount = (Get-ChildItem -Path $OutputRoot -Recurse -Directory).Count
Write-Host ''
Write-Host '========================================================' -ForegroundColor Green
Write-Host '  DONE - 4-site template generated' -ForegroundColor Green
Write-Host "  Location: $OutputRoot" -ForegroundColor Green
Write-Host "  Directories: $dirCount" -ForegroundColor Green
Write-Host "  Year folder: $yearFolder" -ForegroundColor Green
Write-Host '========================================================' -ForegroundColor Green
Write-Host ''

Write-Output ('Created or verified folder template at: {0}' -f $OutputRoot)
