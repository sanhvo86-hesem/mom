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
$jsFile = Join-Path $portalRoot "scripts\portal\14-mes-control-center.js"

Write-Step "Core files exist"
foreach ($file in @($configFile, $dataLayerFile, $apiFile, $migrationFile, $jsFile)) {
  if (-not (Test-Path -LiteralPath $file)) {
    throw "Missing required file: $file"
  }
}

Write-Step "Cutover tokens present"
rg -n "read_retry_count|read_retry_delay_ms|MODE_POSTGRES_PRIMARY|pgWithFallback|setReadMeta|mes_stream|build_exception_dashboard_data|EventSource|connectStream|timescaledb\\.continuous|create_hypertable|add_retention_policy|add_compression_policy" $configFile $dataLayerFile $apiFile $migrationFile $jsFile
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
