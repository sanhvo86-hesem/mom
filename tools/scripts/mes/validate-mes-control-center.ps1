[CmdletBinding()]
param(
  [string]$RepoRoot = "C:\Users\TEST4\qms.hesem.com.vn"
)

$ErrorActionPreference = "Stop"

function Write-Step($message) {
  Write-Host ""
  Write-Host "[STEP] $message" -ForegroundColor Cyan
}

function Assert-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $name"
  }
}

function Invoke-Checked($label, $command, $workdir = $RepoRoot) {
  Write-Host "  -> $label" -ForegroundColor DarkCyan
  Push-Location $workdir
  try {
    & powershell -NoProfile -Command $command
    if ($LASTEXITCODE -ne 0) {
      throw "$label failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
}

Assert-Command php
Assert-Command node
Assert-Command rg

$phpFiles = @(
  (Join-Path $RepoRoot "01-QMS-Portal\api.php"),
  (Join-Path $RepoRoot "01-QMS-Portal\database\DataLayer.php"),
  (Join-Path $RepoRoot "01-QMS-Portal\database\RuntimeShadowSync.php")
)

$jsFiles = @(
  (Join-Path $RepoRoot "01-QMS-Portal\scripts\portal\09b-form-fill-download.js"),
  (Join-Path $RepoRoot "01-QMS-Portal\scripts\portal\09c-record-id-generator.js"),
  (Join-Path $RepoRoot "01-QMS-Portal\scripts\portal\09d-upload-verify.js"),
  (Join-Path $RepoRoot "01-QMS-Portal\scripts\portal\09e-so-jo-wo-dashboard.js"),
  (Join-Path $RepoRoot "01-QMS-Portal\scripts\portal\13-master-data-control.js"),
  (Join-Path $RepoRoot "01-QMS-Portal\scripts\portal\14-mes-control-center.js"),
  (Join-Path $RepoRoot "01-QMS-Portal\scripts\portal\14-exception-dashboard.js")
)

$jsonFiles = @(
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\master-data\master-data.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\mes\mes-runtime.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\orders\orders.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\config\mes_evidence_gate_rules.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\online-forms\schemas\FRM-512.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\online-forms\schemas\FRM-519.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\online-forms\schemas\FRM-521.json")
)

$wiringFiles = @(
  (Join-Path $RepoRoot "01-QMS-Portal\portal.html"),
  (Join-Path $RepoRoot "01-QMS-Portal\scripts\portal\02-state-auth-ui.js"),
  (Join-Path $RepoRoot "01-QMS-Portal\scripts\portal\13-master-data-control.js"),
  (Join-Path $RepoRoot "01-QMS-Portal\scripts\portal\14-mes-control-center.js"),
  (Join-Path $RepoRoot "01-QMS-Portal\scripts\portal\14-exception-dashboard.js"),
  (Join-Path $RepoRoot "01-QMS-Portal\api.php")
)

$mojibakeTargets = @(
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\master-data\master-data.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\mes\mes-runtime.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\orders\orders.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\online-forms\schemas\FRM-512.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\online-forms\schemas\FRM-519.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\online-forms\schemas\FRM-521.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\scripts\portal\14-mes-control-center.js"),
  (Join-Path $RepoRoot "01-QMS-Portal\scripts\portal\14-exception-dashboard.js")
)

Write-Step "PHP syntax"
foreach ($file in $phpFiles) {
  & php -l $file
  if ($LASTEXITCODE -ne 0) {
    throw "PHP syntax failed: $file"
  }
}

Write-Step "JavaScript syntax"
foreach ($file in $jsFiles) {
  & node --check $file
  if ($LASTEXITCODE -ne 0) {
    throw "JavaScript syntax failed: $file"
  }
}

Write-Step "JSON validity"
foreach ($file in $jsonFiles) {
  Get-Content -Raw -Encoding utf8 $file | ConvertFrom-Json | Out-Null
  Write-Host "  OK $file" -ForegroundColor DarkGreen
}

Write-Step "MES wiring"
$wiringCommand = @"
rg -n 'page-mes|page-exceptions|14-mes-control-center|14-exception-dashboard|_renderMesControlCenter|_renderExceptionDashboard|navigateTo\(''exceptions''\)|data-page=\"mes\"|mes_snapshot|mes_connector_snapshot|mes_machine_signal_upsert|exception_dashboard|exception_detail|program_mismatches|program_handshake_queue|program_release_queue|tool_readiness_queue|program_release_risk|tool_readiness_risk|downtime_governance_gaps|wo_launch_blocked|mes_wo_transition_guard|oee_timeline|downtime_pareto|mes_wo_report_progress|mes_downtime_create|mes_maintenance_create|mes_tooling_upsert|data-open-signal-bridge|nc_program_releases|downtime_reason_codes|downtime_resolution_codes|reason_code|resolution_code|runtime_data_layer|shadow_sync_orders_store|shadow_sync_mes_runtime_store' "$($wiringFiles -join '" "')"
"@
Invoke-Checked "MES wiring lookup" $wiringCommand

Write-Step "Mojibake scan"
$pattern = 'Ã|Æ°|PhÃ|XÆ|Ä‘|áº|á»'
& rg -n $pattern @mojibakeTargets
$rgExit = $LASTEXITCODE
if ($rgExit -eq 0) {
  throw "Detected possible mojibake in MES targets."
}
if ($rgExit -gt 1) {
  throw "Mojibake scan failed with exit code $rgExit"
}

Write-Step "MES validation completed"
Write-Host "MES Control Center + Exception Dashboard validation passed." -ForegroundColor Green
