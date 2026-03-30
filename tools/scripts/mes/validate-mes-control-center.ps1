[CmdletBinding()]
param(
  [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
}
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path

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
  (Join-Path $RepoRoot "01-QMS-Portal\api\services\EdgeConnectorService.php"),
  (Join-Path $RepoRoot "01-QMS-Portal\api\services\MesAdapterService.php"),
  (Join-Path $RepoRoot "01-QMS-Portal\api\services\MesAlarmService.php"),
  (Join-Path $RepoRoot "01-QMS-Portal\api\services\MesNcReleaseService.php"),
  (Join-Path $RepoRoot "01-QMS-Portal\api\services\MesToolOffsetService.php"),
  (Join-Path $RepoRoot "01-QMS-Portal\database\config.php"),
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
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\config\variable_library.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\master-data\master-data.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\mes\mes-runtime.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\orders\orders.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\config\mes_evidence_gate_rules.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\online-forms\schemas\FRM-512.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\online-forms\schemas\FRM-519.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\online-forms\schemas\FRM-521.json")
)

$schemaFiles = @(
  (Join-Path $RepoRoot "01-QMS-Portal\database\schema.sql"),
  (Join-Path $RepoRoot "01-QMS-Portal\database\migrations\026_mes_world_class_foundations.sql")
)

$wiringFiles = @(
  (Join-Path $RepoRoot "01-QMS-Portal\portal.html"),
  (Join-Path $RepoRoot "01-QMS-Portal\scripts\portal\02-state-auth-ui.js"),
  (Join-Path $RepoRoot "01-QMS-Portal\scripts\portal\13-master-data-control.js"),
  (Join-Path $RepoRoot "01-QMS-Portal\scripts\portal\14-mes-control-center.js"),
  (Join-Path $RepoRoot "01-QMS-Portal\scripts\portal\14-exception-dashboard.js"),
  (Join-Path $RepoRoot "01-QMS-Portal\database\DataLayer.php"),
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

Write-Step "MES schema foundations"
$schemaCommand = @"
rg -n 'mes_connectivity_adapters|mes_connectivity_events|mes_alarm_catalog|mes_alarm_playbooks|mes_nc_release_packages|mes_nc_download_receipts|mes_tool_preset_offsets|mes_tool_assemblies|v_mes_adapter_health|v_mes_nc_release_readiness' "$($schemaFiles -join '" "')"
"@
Invoke-Checked "MES schema foundation lookup" $schemaCommand

Write-Step "MES wiring"
$wiringCommand = @"
rg -n 'page-mes|page-exceptions|14-mes-control-center|14-exception-dashboard|_renderMesControlCenter|_renderExceptionDashboard|navigateTo\(''exceptions''\)|data-page=\"mes\"|mes_snapshot|mes_foundation_snapshot|mes_alarm_snapshot|mes_nc_release_snapshot|mes_tool_offset_snapshot|mes_connector_snapshot|mes_machine_signal_upsert|mes_connector_ingest|mes_adapter_event_append|mes_alarm_runtime_upsert|mes_nc_download_receipt|mes_tool_offset_upsert|mes_shadow_status|exception_dashboard|exception_detail|program_mismatches|program_handshake_queue|program_release_queue|tool_readiness_queue|program_release_risk|tool_readiness_risk|adapter_governance_risk|alarm_hotspots|nc_download_mismatches|tool_offset_risk|launch_blocker_hotspots|launch_blocker_queue|launch_blockers|adapter_governance_queue|alarm_hotspot_queue|nc_download_mismatch_queue|tool_offset_queue|operator_qualification_gaps|material_trace_gaps|connector_governance_gaps|shadow_sync_failures|primary_read_fallbacks|primary_read_queue|primary_read_status|primary_reads|operator_qualification_queue|material_trace_queue|connector_guard_queue|shadow_status|connector_ingest_status|runtime_mode|skipped_count|last_skipped_at|downtime_governance_gaps|wo_launch_blocked|adapter_governance_failed|machine_alarm_active|nc_download_not_ready|tool_offset_not_ready|stale_signal_timestamp|mes_wo_transition_guard|oee_timeline|downtime_pareto|mes_wo_report_progress|mes_downtime_create|mes_maintenance_create|mes_tooling_upsert|data-open-signal-bridge|nc_program_releases|mes_connectivity_adapters|mes_alarm_catalog|mes_alarm_playbooks|tool_assemblies|mes_connectivity_events|machine_alarm_events|nc_download_receipts|mes_tool_preset_offsets|downtime_reason_codes|downtime_resolution_codes|reason_code|resolution_code|runtime_data_layer|shadow_sync_master_data_store|shadow_sync_orders_store|shadow_sync_mes_runtime_store|observe_wo_launch_blocked|observe_primary_read|mes_signal_replay_guard|runtime_read_model_bundle|getRuntimeMasterDataStore|getRuntimeOrdersStore|getRuntimeMesRuntimeStore' "$($wiringFiles -join '" "')"
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
