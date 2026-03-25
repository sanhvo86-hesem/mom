$root='C:\Users\TEST4\qms.hesem.com.vn'
$genericReadme = Get-Content -Raw -Encoding utf8 (Join-Path $root 'M365-SharePoint-Upload-Template\00-READ-ME-FIRST.txt')
$operReadme = Get-Content -Raw -Encoding utf8 (Join-Path $root 'M365-SharePoint-Upload-Template-Operational\00-READ-ME-FIRST.txt')
$genericPack = Join-Path $root 'M365-SharePoint-Upload-Template'
$operPack = Join-Path $root 'M365-SharePoint-Upload-Template-Operational'
if(Test-Path $genericPack){ Remove-Item -Recurse -Force $genericPack }
if(Test-Path $operPack){ Remove-Item -Recurse -Force $operPack }
powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'tools\scripts\m365\generate_m365_sharepoint_upload_template.ps1') -OutputRoot $genericPack -Year 2026 | Out-Null
powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'tools\scripts\m365\generate_m365_sharepoint_upload_template.ps1') -OutputRoot $operPack -Year 2026 | Out-Null
Set-Content -Path (Join-Path $genericPack '00-READ-ME-FIRST.txt') -Value $genericReadme -Encoding utf8
Set-Content -Path (Join-Path $operPack '00-READ-ME-FIRST.txt') -Value $operReadme -Encoding utf8
$reportDir = Join-Path $root '_reports\m365'
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
$summaryPath = Join-Path $reportDir 'm365-sharepoint-upload-template-enterprise-summary-20260325.txt'
$treePath = Join-Path $reportDir 'm365-sharepoint-upload-template-enterprise-tree-20260325.txt'
$genericCount = (Get-ChildItem -Path $genericPack -Recurse -Directory | Measure-Object).Count
$operCount = (Get-ChildItem -Path $operPack -Recurse -Directory | Measure-Object).Count
$jobGates = Get-ChildItem -Path (Join-Path $operPack 'HESEM-QMS-Core\03-Job-Dossiers\2026\{CustomerID}\{JobNum}-{PartNo}-REV-{Revision}') -Directory | Select-Object -ExpandProperty Name
$summary = @(
  'M365 SHAREPOINT UPLOAD TEMPLATE ENTERPRISE SUMMARY',
  '',
  'Date: 2026-03-25',
  'Year folder baseline: 2026',
  '',
  ('Generic pack directory count: {0}' -f $genericCount),
  ('Operational pack directory count: {0}' -f $operCount),
  '',
  'Validated job gates:'
) + $jobGates + @(
  '',
  'Validated site roots:',
  'HESEM-QMS-Core',
  'HESEM-People-Restricted',
  'HESEM-Digital-Control',
  '',
  'Validated critical branches:',
  '05-Department-Records/.../06-Working-Transitory-and-Draft/ROLE-{RoleCode}/90-Employee-Workbenches/{EmployeeID}-{DisplayName}',
  '08-People-Records/02-Pending-Starters-and-Recruitment-Handover/{YYYY}/{Population}/{CandidateOrPersonID}-{Name}',
  '08-People-Records/06-Restricted-Shared-Operations/{RestrictedProcess}/00-Current',
  '09-Digital-System-Records/<SystemArea>/00-Current',
  '10-QMS-Source-Control/01-Controlled-Source/qms.hesem.com.vn'
)
Set-Content -Path $summaryPath -Value $summary -Encoding utf8
Get-ChildItem -Path $operPack -Recurse -Directory | ForEach-Object { $_.FullName.Substring($operPack.Length + 1) } | Set-Content -Path $treePath -Encoding utf8
Write-Output ('Generic pack directories: ' + $genericCount)
Write-Output ('Operational pack directories: ' + $operCount)
Write-Output ('Summary: ' + $summaryPath)
Write-Output ('Tree: ' + $treePath)
