[CmdletBinding()]
param(
  [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
}
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path

function Invoke-Step {
  param(
    [string]$Name,
    [scriptblock]$Action
  )

  Write-Host ""
  Write-Host "[CHECK] $Name" -ForegroundColor Cyan
  & $Action
  Write-Host "[PASS ] $Name" -ForegroundColor Green
}

function Assert-PathExists {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Missing required path: $Path"
  }
}

$portalRoot = Join-Path $RepoRoot "01-QMS-Portal"
$apiFile = Join-Path $portalRoot "api.php"
$dataLayerFile = Join-Path $portalRoot "database\DataLayer.php"
$runtimeShadowFile = Join-Path $portalRoot "database\RuntimeShadowSync.php"
$schemaFile = Join-Path $portalRoot "qms-data\online-forms\schemas\FRM-631.json"
$jsFiles = @(
  (Join-Path $portalRoot "scripts\portal\09-online-forms.js"),
  (Join-Path $portalRoot "scripts\portal\09b-form-fill-download.js"),
  (Join-Path $portalRoot "scripts\portal\09c-record-id-generator.js"),
  (Join-Path $portalRoot "scripts\portal\09d-upload-verify.js"),
  (Join-Path $portalRoot "scripts\portal\09e-so-jo-wo-dashboard.js"),
  (Join-Path $portalRoot "scripts\portal\09h-allocation-tracker.js"),
  (Join-Path $portalRoot "scripts\portal\11-e-signature.js"),
  (Join-Path $portalRoot "scripts\portal\12-searchable-input.js"),
  (Join-Path $portalRoot "scripts\portal\13-master-data-control.js")
)
$requiredApiActions = @(
  "form_catalog_snapshot",
  "master_data_snapshot",
  "order_hierarchy",
  "record_id_generate",
  "record_id_history",
  "form_fill_download_offline",
  "form_fill_submit_online",
  "upload_read_hidden_sheet",
  "upload_submit",
  "online_form_entry_get"
)

Invoke-Step "Required files exist" {
  Assert-PathExists $apiFile
  Assert-PathExists $dataLayerFile
  Assert-PathExists $runtimeShadowFile
  Assert-PathExists $schemaFile
  foreach ($file in $jsFiles) { Assert-PathExists $file }
  Assert-PathExists (Join-Path $portalRoot "tools\excel_hidden_sheet_runtime.py")
}

Invoke-Step "PHP syntax check" {
  & php -l $apiFile | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "php -l failed" }
  & php -l $dataLayerFile | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "php -l failed for DataLayer" }
  & php -l $runtimeShadowFile | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "php -l failed for RuntimeShadowSync" }
}

Invoke-Step "JavaScript parse check" {
  $nodeScript = @"
const fs = require('fs');
const files = [
$(($jsFiles | ForEach-Object { "  '$($_ -replace '\\','/')'" }) -join ",`n")
];
let ok = true;
for (const file of files) {
  try {
    new Function(fs.readFileSync(file, 'utf8'));
    console.log('PASS ' + file);
  } catch (error) {
    ok = false;
    console.error('FAIL ' + file);
    console.error(error.message);
  }
}
if (!ok) process.exit(1);
"@
  $nodeScript | node -
  if ($LASTEXITCODE -ne 0) { throw "JS parse failed" }
}

Invoke-Step "No forbidden mojibake identifiers remain" {
  $matches = rg -n "Đạte|formĐạta|apiCallFormĐạta|getĐạte|_formatĐạte" @jsFiles
  if ($LASTEXITCODE -eq 0 -and $matches) {
    throw "Forbidden mojibake identifiers still exist.`n$matches"
  }
}

Invoke-Step "FRM-631 contract check" {
  $python = @"
from pathlib import Path
import json

schema = json.loads(Path(r'$($schemaFile -replace '\\','\\')').read_text(encoding='utf-8'))
required_context = set(schema.get('record_context', {}).get('required', []))
expected_context = {'customer_id','so_number','jo_number','wo_number','part_number','part_revision'}
missing_context = sorted(expected_context - required_context)
if missing_context:
    raise SystemExit('Missing record_context keys: ' + ', '.join(missing_context))

fields = {field['id']: field for field in schema.get('fields', [])}
for field_id in ['customer_id','so_number','jo_number','wo_number','part_number','part_revision','capa_number','root_cause_categories']:
    if field_id not in fields:
        raise SystemExit('Missing field: ' + field_id)

for lookup_id in ['customer_id','so_number','jo_number','wo_number','part_number','part_revision','capa_number']:
    field = fields[lookup_id]
    if field.get('type') != 'lookup':
        raise SystemExit(f'{lookup_id} must be lookup')
    if field.get('strict_select') is not True:
        raise SystemExit(f'{lookup_id} must be strict_select=true')

root = fields['root_cause_categories']
if root.get('type') != 'multi_select':
    raise SystemExit('root_cause_categories must be multi_select')

signature_blocks = schema.get('signature_blocks', [])
block_ids = {block.get('id') for block in signature_blocks}
for required in ['reported_by','reviewed_by','approved_by']:
    if required not in block_ids:
        raise SystemExit('Missing signature block: ' + required)

approval_flow = schema.get('approval_flow', [])
flow_ids = [step.get('signature_block_id') or step.get('id') for step in approval_flow]
for required in ['reported_by','reviewed_by','approved_by']:
    if required not in flow_ids:
        raise SystemExit('Missing approval flow step: ' + required)

print('FRM-631 schema contract OK')
"@
  $python | python -
  if ($LASTEXITCODE -ne 0) { throw "FRM-631 contract failed" }
}

Invoke-Step "API actions present" {
  $apiText = Get-Content -LiteralPath $apiFile -Raw
  foreach ($action in $requiredApiActions) {
    if ($apiText -notmatch [regex]::Escape("case '$action':")) {
      throw "Missing api.php action: $action"
    }
  }
}

Invoke-Step "Governance services wired into api.php" {
  $apiText = Get-Content -LiteralPath $apiFile -Raw
  foreach ($token in @(
    'master_data_service()',
    'order_workflow_service()',
    'runtime_data_layer()',
    'runtime_read_model_bundle(',
    'observe_primary_read(',
    'load_mes_shift_patterns(',
    'mes_build_alarm_ack_queue(',
    'mes_material_genealogy_overlay(',
    'mes_merge_material_trace_with_genealogy(',
    'mes_build_material_genealogy_queue(',
    'mes_build_shift_handover_queue(',
    'shadow_sync_master_data_store(',
    'shadow_sync_orders_store(',
    'shadow_sync_mes_runtime_store('
  )) {
    if ($apiText -notmatch [regex]::Escape($token)) {
      throw "Missing governance service usage: $token"
    }
  }
}

Invoke-Step "Runtime shadow sync surface exists" {
  $dataLayerText = Get-Content -LiteralPath $dataLayerFile -Raw
  foreach ($token in @(
    'getRuntimeMasterDataStore',
    'getRuntimeOrdersStore',
    'getRuntimeMesRuntimeStore',
    'getLastReadMeta',
    'syncMasterDataStore',
    'syncOrdersStore',
    'syncMesRuntimeStore',
    'RuntimeShadowSync'
  )) {
    if ($dataLayerText -notmatch [regex]::Escape($token)) {
      throw "Missing DataLayer runtime shadow token: $token"
    }
  }
}

Invoke-Step "Portal wiring present" {
  $portalHtml = Get-Content -LiteralPath (Join-Path $portalRoot "portal.html") -Raw
  foreach ($token in @(
    "09-online-forms.js",
    "09b-form-fill-download.js",
    "09c-record-id-generator.js",
    "09d-upload-verify.js",
    "09e-so-jo-wo-dashboard.js",
    "09h-allocation-tracker.js",
    "11-e-signature.js",
    "12-searchable-input.js",
    "13-master-data-control.js"
  )) {
    if ($portalHtml -notmatch [regex]::Escape($token)) {
      throw "Missing portal script tag: $token"
    }
  }
}

Write-Host ""
Write-Host "Evidence Control vertical slice self-audit completed successfully." -ForegroundColor Green
