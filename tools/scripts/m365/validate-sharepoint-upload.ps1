<#
.SYNOPSIS
    HESEM QMS — SharePoint Upload Filename Validator
    Validates filenames against ANNEX-137 naming convention before upload.

.DESCRIPTION
    Scans a folder of files intended for SharePoint upload.
    Checks each filename against the 6 naming patterns defined in
    core-standards/15-evidence-and-records-naming.md and ANNEX-137.
    Outputs PASS/FAIL report with suggested corrections.

.PARAMETER Path
    Path to folder containing files to validate.

.PARAMETER ReportPath
    Optional path for output CSV report. Defaults to validation-report-{date}.csv.

.EXAMPLE
    .\validate-sharepoint-upload.ps1 -Path "C:\Upload-Queue"
    .\validate-sharepoint-upload.ps1 -Path "C:\Upload-Queue" -ReportPath "C:\Reports\upload-check.csv"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Path,

    [string]$ReportPath = ""
)

# ═══════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════

$AllowedCharsPattern = '^[A-Za-z0-9\-_\.]+$'
$MaxFilenameLength = 120
$DatePattern = '20[2-3][0-9](0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])'
$HHMMPattern = '([01][0-9]|2[0-3])[0-5][0-9]'
$UserIdPattern = '[A-Z][A-Z0-9]{1,3}'
$VersionPattern = 'V\d+(\.\d+)?'

# RecordType codes (from ANNEX-137 Section 4)
$RecordTypeCodes = @(
    # Job Dossier
    'PO','CR','MTR','IQC','TRV','CMM','FAI-BALLOON','COC','PACK','SHIP-LABEL',
    'POD','CONCESSION','REWORK','CUST-APPR','PROVEOUT','OFFSET-LOG','TOOL-WEAR','DOWNTIME',
    # Photos
    'PHOTO-SETUP','PHOTO-FAI','PHOTO-FINAL','PHOTO-PACK','PHOTO-NCR','PHOTO-GEN',
    # Engineering
    'NC','CAM','MODEL','DWG','SETUP','INSP','FIXTURE','SIM','CTRL-PLAN',
    # QMS Governance
    'REPORT','CHECKLIST','MINUTES','INPUT-PACK','ACTION-LOG','KPI-REPORT','RISK-REG','MEETING-MIN',
    # Training
    'OJT','GATE-TEST','CERT-SCAN','SIGNOFF',
    # Calibration
    'CAL-CERT','MAINT-LOG','SPEC',
    # Supplier
    'SUP-CERT','SUP-AUDIT','SCAR','SUP-EVAL'
)

# Engineering file types
$EngFileTypes = @('NC','CAM','MODEL','DWG','SETUP','INSP','FIXTURE','SIM','CTRL-PLAN')

# Machine families
$MachineFamilies = @('3AX','5AX','TURN','MTURN','CMM','ALL')

# Form code pattern
$FormCodePattern = 'FRM-\d{3,4}'

# ═══════════════════════════════════════════════════
# PATTERN DEFINITIONS (6 patterns from ANNEX-137)
# ═══════════════════════════════════════════════════

# Pattern 1: Filled Form
# FRM-{code}_V{ver}_{scope}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}
$P1_Regex = "^FRM-\d{3,4}_${VersionPattern}_.+_${DatePattern}_${HHMMPattern}-${UserIdPattern}\.\w+$"

# Pattern 2: Job Evidence
# {RecordType}_{JobNum}_{PartRev}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}
$P2_Regex = "^[A-Z][A-Z0-9\-]+_JOB-\d{4}-\d{4}_.+_${DatePattern}_${HHMMPattern}-${UserIdPattern}\.\w+$"

# Pattern 3: Engineering Baseline
# {FileType}_{PartRev}_{Op}_{Machine}_V{ver}.{ext}
$P3_Regex = "^(NC|CAM|MODEL|DWG|SETUP|INSP|FIXTURE|SIM|CTRL-PLAN)_.+_(OP\d{2}|ALL)_[A-Z0-9]+_${VersionPattern}\.\w+$"

# Pattern 4: Non-job Evidence
# {RecordType}_{scope}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}
$P4_Regex = "^[A-Z][A-Z0-9\-]+_[A-Z][A-Z0-9\-]+_${DatePattern}_${HHMMPattern}-${UserIdPattern}\.\w+$"

# Pattern 5: Form Blank
# FRM-{code}_{Title}_V{ver}.xlsx
$P5_Regex = "^FRM-\d{3,4}_.+_${VersionPattern}\.xlsx$"

# Pattern 6: Asset Records
# {AssetType}-{AssetID}_{DocType}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}
$P6_Regex = "^(FIX|GAGE|TOOL-HOLDER|JIG|COLLET|JAW|CLAMP)-[A-Z0-9\-]+_[A-Z\-]+_${DatePattern}_${HHMMPattern}-${UserIdPattern}\.\w+$"

# Baseline forms (FRM-306, FRM-307) in Part-REV-Master
$PBaseline_Regex = "^FRM-(306|307)_.+_${VersionPattern}.*\.\w+$"

# ═══════════════════════════════════════════════════
# VALIDATION FUNCTION
# ═══════════════════════════════════════════════════

function Test-Filename {
    param([string]$Filename)

    $result = [PSCustomObject]@{
        Filename     = $Filename
        Status       = "FAIL"
        Pattern      = ""
        Issues       = @()
    }

    # Check 1: Allowed characters
    if ($Filename -notmatch $AllowedCharsPattern) {
        $result.Issues += "REJECT: Contains invalid characters (spaces or special chars)"
    }

    # Check 2: Length
    if ($Filename.Length -gt $MaxFilenameLength) {
        $result.Issues += "WARN: Filename exceeds $MaxFilenameLength chars ($($Filename.Length))"
    }

    # Check 3: Has date segment
    if ($Filename -notmatch $DatePattern -and $Filename -notmatch $VersionPattern) {
        $result.Issues += "REJECT: No date (YYYYMMDD) or version (V#) found"
    }

    # Check 4: Match against patterns
    $matched = $false

    if ($Filename -match $P1_Regex) {
        $result.Pattern = "P1-FilledForm"
        $matched = $true
        # Additional: check form version format
        if ($Filename -notmatch "_V\d+\.\d+_") {
            $result.Issues += "WARN: Form version should be V#.# format (e.g., V2.1)"
        }
    }
    elseif ($Filename -match $P3_Regex) {
        $result.Pattern = "P3-EngBaseline"
        $matched = $true
        # Check file type is valid
        $ft = ($Filename -split '_')[0]
        if ($ft -notin $EngFileTypes) {
            $result.Issues += "FLAG: FileType '$ft' not in engineering dictionary"
        }
    }
    elseif ($Filename -match $PBaseline_Regex) {
        $result.Pattern = "P3-BaselineForm"
        $matched = $true
    }
    elseif ($Filename -match $P5_Regex) {
        $result.Pattern = "P5-FormBlank"
        $matched = $true
    }
    elseif ($Filename -match $P6_Regex) {
        $result.Pattern = "P6-AssetRecord"
        $matched = $true
    }
    elseif ($Filename -match $P2_Regex) {
        $result.Pattern = "P2-JobEvidence"
        $matched = $true
        # Check RecordType
        $rt = ($Filename -split '_')[0]
        if ($rt -notin $RecordTypeCodes) {
            $result.Issues += "FLAG: RecordType '$rt' not in dictionary"
        }
    }
    elseif ($Filename -match $P4_Regex) {
        $result.Pattern = "P4-NonJobEvidence"
        $matched = $true
        $rt = ($Filename -split '_')[0]
        if ($rt -notin $RecordTypeCodes) {
            $result.Issues += "FLAG: RecordType '$rt' not in dictionary"
        }
    }

    if (-not $matched) {
        $result.Issues += "REJECT: Does not match any of the 6 naming patterns"
    }

    # Set final status
    $hasReject = ($result.Issues | Where-Object { $_ -match '^REJECT' }).Count -gt 0
    $hasFlag   = ($result.Issues | Where-Object { $_ -match '^FLAG' }).Count -gt 0
    $hasWarn   = ($result.Issues | Where-Object { $_ -match '^WARN' }).Count -gt 0

    if ($hasReject) { $result.Status = "FAIL" }
    elseif ($hasFlag) { $result.Status = "FLAG" }
    elseif ($hasWarn) { $result.Status = "WARN" }
    elseif ($matched) { $result.Status = "PASS" }

    return $result
}

# ═══════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════

if (-not (Test-Path $Path)) {
    Write-Error "Path not found: $Path"
    exit 1
}

$files = Get-ChildItem -Path $Path -File -Recurse
if ($files.Count -eq 0) {
    Write-Host "No files found in: $Path" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  HESEM QMS — SharePoint Upload Filename Validator" -ForegroundColor Cyan
Write-Host "  ANNEX-137 Naming Convention Check" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Scanning: $Path"
Write-Host "Files found: $($files.Count)"
Write-Host ""

$results = @()
$passCount = 0
$failCount = 0
$flagCount = 0
$warnCount = 0

foreach ($file in $files) {
    $r = Test-Filename -Filename $file.Name
    $results += $r

    $color = switch ($r.Status) {
        "PASS" { "Green"; $passCount++ }
        "FAIL" { "Red"; $failCount++ }
        "FLAG" { "Yellow"; $flagCount++ }
        "WARN" { "DarkYellow"; $warnCount++ }
    }

    $issueText = if ($r.Issues.Count -gt 0) { " — " + ($r.Issues -join "; ") } else { "" }
    Write-Host "  [$($r.Status)] " -ForegroundColor $color -NoNewline
    Write-Host "$($file.Name)" -NoNewline
    if ($r.Pattern) { Write-Host " ($($r.Pattern))" -ForegroundColor DarkGray -NoNewline }
    Write-Host $issueText -ForegroundColor DarkGray
}

# Summary
Write-Host ""
Write-Host "───────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  PASS: $passCount  |  FAIL: $failCount  |  FLAG: $flagCount  |  WARN: $warnCount  |  Total: $($files.Count)" -ForegroundColor Cyan
Write-Host "───────────────────────────────────────────────────" -ForegroundColor DarkGray

# Export CSV report
if (-not $ReportPath) {
    $ReportPath = Join-Path $Path ("validation-report-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".csv")
}

$results | Select-Object Filename, Status, Pattern, @{N='Issues';E={$_.Issues -join '; '}} |
    Export-Csv -Path $ReportPath -NoTypeInformation -Encoding UTF8

Write-Host ""
Write-Host "Report saved: $ReportPath" -ForegroundColor Green
Write-Host ""
