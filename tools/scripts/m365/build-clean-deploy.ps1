param(
  [string]$SourceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$OutputRoot = '',
  [string]$ZipPath = '',
  [switch]$IncludeRootHtaccess
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $SourceRoot '_build\qms.hesem.com.vn'
}

if ([string]::IsNullOrWhiteSpace($ZipPath)) {
  $ZipPath = Join-Path $SourceRoot '_build\qms.hesem.com.vn-clean.zip'
}

$rootDirs = @(
  '01-QMS-Portal',
  '02-Tai-Lieu-He-Thong',
  '03-Tai-Lieu-Van-Hanh',
  '04-Bieu-Mau',
  '10-Training-Academy',
  '11-Glossary',
  'assets'
)

$rootFiles = @(
  '.ftpquota',
  'general_note.md',
  'index.php',
  'robots.txt'
)

if ($IncludeRootHtaccess) {
  $rootFiles += '.htaccess'
}

function Copy-IfExists {
  param(
    [string]$SourcePath,
    [string]$DestinationPath
  )

  if (-not (Test-Path -LiteralPath $SourcePath)) {
    return
  }

  $parent = Split-Path -Parent $DestinationPath
  if ($parent -and -not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent | Out-Null
  }

  if ((Get-Item -LiteralPath $SourcePath) -is [System.IO.DirectoryInfo]) {
    Copy-Item -LiteralPath $SourcePath -Destination $DestinationPath -Recurse -Force
  } else {
    Copy-Item -LiteralPath $SourcePath -Destination $DestinationPath -Force
  }
}

if (Test-Path -LiteralPath $OutputRoot) {
  Remove-Item -LiteralPath $OutputRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $OutputRoot | Out-Null

foreach ($name in $rootDirs) {
  Copy-IfExists -SourcePath (Join-Path $SourceRoot $name) -DestinationPath (Join-Path $OutputRoot $name)
}

foreach ($name in $rootFiles) {
  Copy-IfExists -SourcePath (Join-Path $SourceRoot $name) -DestinationPath (Join-Path $OutputRoot $name)
}

$zipParent = Split-Path -Parent $ZipPath
if ($zipParent -and -not (Test-Path -LiteralPath $zipParent)) {
  New-Item -ItemType Directory -Path $zipParent | Out-Null
}

if (Test-Path -LiteralPath $ZipPath) {
  Remove-Item -LiteralPath $ZipPath -Force
}

Compress-Archive -Path (Join-Path $OutputRoot '*') -DestinationPath $ZipPath -Force

Write-Host "Clean deploy folder: $OutputRoot"
Write-Host "Clean deploy zip:    $ZipPath"
Write-Host "Root .htaccess kept: $($IncludeRootHtaccess.IsPresent)"
