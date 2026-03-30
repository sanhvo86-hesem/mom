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
  (Join-Path $RepoRoot "01-QMS-Portal\api\services\EpicorIntegrationService.php"),
  (Join-Path $RepoRoot "01-QMS-Portal\api\services\MesAdapterService.php"),
  (Join-Path $RepoRoot "01-QMS-Portal\api\services\MesAlarmService.php"),
  (Join-Path $RepoRoot "01-QMS-Portal\api\services\MesNcReleaseService.php"),
  (Join-Path $RepoRoot "01-QMS-Portal\api\services\MesToolOffsetService.php"),
  (Join-Path $RepoRoot "01-QMS-Portal\api\services\UploadHardeningService.php"),
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
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\config\epicor_integration_policy.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\master-data\master-data.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\erp\epicor-runtime.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\mes\mes-runtime.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\orders\orders.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\config\mes_evidence_gate_rules.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\config\mes_shift_patterns.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\online-forms\schemas\FRM-512.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\online-forms\schemas\FRM-519.json"),
  (Join-Path $RepoRoot "01-QMS-Portal\qms-data\online-forms\schemas\FRM-521.json")
)

$schemaFiles = @(
  (Join-Path $RepoRoot "01-QMS-Portal\database\schema.sql"),
  (Join-Path $RepoRoot "01-QMS-Portal\database\migrations\026_mes_world_class_foundations.sql"),
  (Join-Path $RepoRoot "01-QMS-Portal\database\migrations\027_mes_alarm_governance_alignment.sql"),
  (Join-Path $RepoRoot "01-QMS-Portal\database\migrations\028_epicor_mes_integration_foundations.sql"),
  (Join-Path $RepoRoot "01-QMS-Portal\database\migrations\029_mes_timescale_runtime_activation.sql")
)
$variableLibraryFile = Join-Path $RepoRoot "01-QMS-Portal\qms-data\config\variable_library.json"

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
rg -n 'mes_connectivity_adapters|mes_connectivity_events|mes_alarm_catalog|mes_alarm_playbooks|mes_nc_release_packages|mes_nc_download_receipts|mes_tool_preset_offsets|mes_tool_assemblies|mes_erp_sync_runs|mes_erp_reconciliation_exceptions|integration_system|sync_direction|sync_status|completed_at|records_received|records_processed|exception_status|expected_value|actual_value|is_acknowledged|acknowledged_at|related_job_number|v_mes_adapter_health|v_mes_nc_release_readiness|create_hypertable|timescaledb\\.continuous|mes_machine_telemetry_hourly|mes_downtime_daily|mes_tool_life_daily|add_retention_policy|add_compression_policy|mes_machine_state_events|mes_machine_telemetry|mes_inline_measurements' "$($schemaFiles -join '" "')"
"@
Invoke-Checked "MES schema foundation lookup" $schemaCommand

Write-Step "MES variable coverage"
$variableCommand = @"
rg -n 'mes_alarm_management|mes_nc_release_governance|mes_tool_offset_governance|mes_material_genealogy_governance|mes_shift_handover_governance|erp_mes_integration_governance|material_issue_id_mes|genealogy_snapshot_id_mes|shift_handover_id_mes|handover_acknowledged_at_mes|epicor_sync_run_id_erp|epicor_sync_domain_erp|epicor_outbox_event_id_erp' "$variableLibraryFile"
"@
Invoke-Checked "MES variable lookup" $variableCommand

Write-Step "MES wiring"
$wiringCommand = @"
rg -n 'page-mes|page-exceptions|14-mes-control-center|14-exception-dashboard|_renderMesControlCenter|_renderExceptionDashboard|navigateTo\(''exceptions''\)|data-page=\"mes\"|mes_snapshot|mes_stream|mes_cutover_audit|mes_foundation_snapshot|mes_alarm_snapshot|mes_nc_release_snapshot|mes_tool_offset_snapshot|mes_connector_snapshot|mes_machine_signal_upsert|mes_connector_ingest|mes_adapter_event_append|mes_alarm_runtime_upsert|mes_alarm_acknowledge|mes_alarm_escalate|mes_alarm_clear|mes_nc_download_receipt|mes_tool_offset_upsert|mes_material_issue|mes_genealogy_snapshot|mes_shift_snapshot|mes_shift_handover_submit|mes_shadow_status|epicor_sync_snapshot|epicor_sync_run_upsert|epicor_reconciliation_upsert|epicor_outbox_upsert|exception_dashboard|exception_detail|program_mismatches|program_handshake_queue|program_release_queue|tool_readiness_queue|program_release_risk|tool_readiness_risk|alarm_ack_gaps|material_genealogy_gaps|shift_handover_gaps|adapter_governance_risk|alarm_hotspots|nc_download_mismatches|tool_offset_risk|launch_blocker_hotspots|launch_blocker_queue|launch_blockers|adapter_governance_queue|alarm_hotspot_queue|alarm_ack_queue|nc_download_mismatch_queue|tool_offset_queue|operator_qualification_gaps|material_trace_gaps|material_genealogy_queue|shift_handover_queue|connector_governance_gaps|shadow_sync_failures|primary_read_fallbacks|primary_read_queue|primary_read_status|primary_reads|cutover_audit|cutover_drift_entities|build_runtime_cutover_audit|operator_qualification_queue|material_trace_queue|connector_guard_queue|current_shift|load_mes_shift_patterns|mes_build_alarm_ack_queue|mes_material_genealogy_overlay|mes_merge_material_trace_with_genealogy|mes_build_material_genealogy_queue|mes_build_shift_handover_queue|shadow_status|connector_ingest_status|runtime_mode|skipped_count|last_skipped_at|downtime_governance_gaps|wo_launch_blocked|adapter_governance_failed|machine_alarm_active|nc_download_not_ready|tool_offset_not_ready|material_genealogy_incomplete|shift_handover_incomplete|stale_signal_timestamp|mes_wo_transition_guard|oee_timeline|downtime_pareto|mes_wo_report_progress|mes_downtime_create|mes_maintenance_create|mes_tooling_upsert|data-open-signal-bridge|data-open-adapter-event|data-alarm-action|data-shift-handover|data-material-issue|data-genealogy-snapshot|openAdapterEventModal|openAlarmGovernanceModal|openShiftHandoverModal|openMaterialIssueModal|openGenealogySnapshotModal|nc_program_releases|mes_connectivity_adapters|mes_alarm_catalog|mes_alarm_playbooks|tool_assemblies|mes_connectivity_events|machine_alarm_events|nc_download_receipts|mes_tool_preset_offsets|material_consumption|part_genealogy|shift_handover|downtime_reason_codes|downtime_resolution_codes|reason_code|resolution_code|runtime_data_layer|shadow_sync_master_data_store|shadow_sync_orders_store|shadow_sync_mes_runtime_store|shadow_sync_epicor_runtime_store|observe_wo_launch_blocked|observe_primary_read|mes_signal_replay_guard|runtime_read_model_bundle|getRuntimeMasterDataStore|getRuntimeOrdersStore|getRuntimeMesRuntimeStore|getRuntimeEpicorIntegrationStore|EpicorIntegrationService|epicor_integration_policy.json|epicor-runtime.json|epicor_sync_status|epicor_sync_queue|epicor_reconciliation_open|epicor_outbox_pending|load_epicor_runtime_store|save_epicor_runtime_store|integration_system|sync_direction|sync_status|completed_at|records_received|records_processed|exception_status|expected_value|actual_value|EventSource|connectStream|disconnectStream|streamStatus|primary_read_fallbacks|read_retry_count|read_retry_delay_ms|utf8_encoding|UTF8_VALIDATED_EXTENSIONS' "$($wiringFiles -join '" "')"
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
