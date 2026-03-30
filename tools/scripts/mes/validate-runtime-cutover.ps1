[CmdletBinding()]
param(
  [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
}
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$portalRoot = Join-Path $RepoRoot "01-QMS-Portal"

function Write-Step($message) {
  Write-Host ""
  Write-Host "[STEP] $message" -ForegroundColor Cyan
}

function Assert-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $name"
  }
}

Assert-Command php
Assert-Command rg

$configFile = Join-Path $portalRoot "database\config.php"
$dataLayerFile = Join-Path $portalRoot "database\DataLayer.php"
$apiFile = Join-Path $portalRoot "api.php"
$migrationFile = Join-Path $portalRoot "database\migrations\029_mes_timescale_runtime_activation.sql"
$notifyMigrationFile = Join-Path $portalRoot "database\migrations\030_mes_realtime_notify.sql"
$jsFile = Join-Path $portalRoot "scripts\portal\14-mes-control-center.js"
$pollingServiceFile = Join-Path $portalRoot "api\services\MtconnectPollingService.php"
$pollingCliFile = Join-Path $portalRoot "scripts\run_mtconnect_poll_cycle.php"

Write-Step "Core files exist"
foreach ($file in @($configFile, $dataLayerFile, $apiFile, $migrationFile, $notifyMigrationFile, $jsFile, $pollingServiceFile, $pollingCliFile)) {
  if (-not (Test-Path -LiteralPath $file)) {
    throw "Missing required file: $file"
  }
}

Write-Step "Cutover tokens present"
rg -n "read_retry_count|read_retry_delay_ms|MODE_POSTGRES_PRIMARY|pgWithFallback|setReadMeta|mes_stream|stream_mode|polling_fallback|mes_mtconnect_poll_once|mes_mtconnect_poll_batch|mes_mtconnect_poll_url|mes_http_fetch_text|build_exception_dashboard_data|EventSource|connectStream|streamEligible|data-poll-mtconnect|mes-poll-batch|pollMtconnectBatch|MtconnectPollingService|run_mtconnect_poll_cycle|timescaledb\\.continuous|create_hypertable|add_retention_policy|add_compression_policy|pg_notify|notify_mes_machine_telemetry|notify_mes_machine_alarm|notify_mes_downtime_event" $configFile $dataLayerFile $apiFile $migrationFile $notifyMigrationFile $jsFile $pollingServiceFile $pollingCliFile
if ($LASTEXITCODE -ne 0) {
  throw "Missing one or more cutover tokens."
}

Write-Step "Runtime mode summary"
$portalRootSlash = $portalRoot -replace '\\','/'
$repoRootSlash = $RepoRoot -replace '\\','/'
$phpTemplate = @'
require '{0}/database/Connection.php';
require '{0}/database/RuntimeShadowSync.php';
require '{0}/database/DataLayer.php';
$layer = new \HESEM\QMS\Database\DataLayer('{0}/qms-data', '{1}');
echo json_encode($layer->getModeSummary(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
'@
$phpScript = [string]::Format($phpTemplate, $portalRootSlash, $repoRootSlash)
$tmpPhp = Join-Path $RepoRoot ".cutover-audit.tmp.php"
Set-Content -LiteralPath $tmpPhp -Value "<?php`n$phpScript" -Encoding UTF8
$summaryJson = & php -f $tmpPhp
Remove-Item -LiteralPath $tmpPhp -ErrorAction SilentlyContinue
if ($LASTEXITCODE -ne 0) {
  throw "Failed to read runtime mode summary."
}
$summary = $summaryJson | ConvertFrom-Json
$summary | Format-List | Out-Host

Write-Step "Cutover validation completed"
Write-Host "Runtime cutover audit completed successfully." -ForegroundColor Green
