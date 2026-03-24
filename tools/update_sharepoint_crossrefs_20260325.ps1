$ErrorActionPreference = 'Stop'

$repoRoot = 'C:\Users\TEST4\qms.hesem.com.vn'
$nodeScript = Join-Path $repoRoot 'tools\update_sharepoint_governance_20260325.mjs'

if (-not (Test-Path $nodeScript)) {
    throw "Missing script: $nodeScript"
}

node $nodeScript
