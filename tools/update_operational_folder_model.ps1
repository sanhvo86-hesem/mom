Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Replace-Regex {
    param(
        [string]$Path,
        [string]$Pattern,
        [string]$Replacement
    )

    $content = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    $updated = [System.Text.RegularExpressions.Regex]::Replace(
        $content,
        $Pattern,
        $Replacement,
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )

    if ($updated -eq $content) {
        throw "Pattern not found in $Path"
    }

    [System.IO.File]::WriteAllText($Path, $updated, [System.Text.Encoding]::UTF8)
}

$annex133 = "C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\03-Reference\01-ANNEX-100\13-ANNEX-130-M365-Records-Control\annex-133-m365-records-site-topology-library-and-folder-blueprint.html"
$annex134 = "C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\03-Reference\01-ANNEX-100\13-ANNEX-130-M365-Records-Control\annex-134-m365-records-provisioning-permissions-and-automation-architecture.html"
$wi102 = "C:\Users\TEST4\qms.hesem.com.vn\03-Tai-Lieu-Van-Hanh\02-Work-Instructions\01-WI-100\wi-102-sharepoint-record-sites-libraries-and-permissions-click-by-click.html"

$annex133SectionPattern = '<div class="figure-box">\s*<p style="margin:0;" class="path">05-Ph.+?<div class="muted">.+?</div>'
$annex133SectionReplacement = @'
<div class="figure-box">
  <p style="margin:0;" class="path">05-Department-Records/DEP-{CODE}/00-Live-Control-and-Master-Data/</p>
  <p style="margin:4px 0 0;" class="path">05-Department-Records/DEP-{CODE}/01-Governance/00-Current/</p>
  <p style="margin:4px 0 0;" class="path">05-Department-Records/DEP-{CODE}/01-Governance/{YYYY}/</p>
  <p style="margin:4px 0 0;" class="path">05-Department-Records/DEP-{CODE}/02-Operations/00-Current/</p>
  <p style="margin:4px 0 0;" class="path">05-Department-Records/DEP-{CODE}/02-Operations/{YYYY}/</p>
  <p style="margin:4px 0 0;" class="path">05-Department-Records/DEP-{CODE}/03-Registers-and-Logs/00-Current/</p>
  <p style="margin:4px 0 0;" class="path">05-Department-Records/DEP-{CODE}/03-Registers-and-Logs/{YYYY}/</p>
  <p style="margin:4px 0 0;" class="path">05-Department-Records/DEP-{CODE}/04-Projects-and-Improvement/00-Active/</p>
  <p style="margin:4px 0 0;" class="path">05-Department-Records/DEP-{CODE}/04-Projects-and-Improvement/{YYYY}/</p>
  <p style="margin:4px 0 0;" class="path">05-Department-Records/DEP-{CODE}/05-Interfaces-and-Released-Packs/00-Current/</p>
  <p style="margin:4px 0 0;" class="path">05-Department-Records/DEP-{CODE}/05-Interfaces-and-Released-Packs/{YYYY}/</p>
  <p style="margin:4px 0 0;" class="path">05-Department-Records/DEP-{CODE}/99-Archive/</p>
</div>
<div class="muted">Department records must separate live operating data from year-based history. If a source-of-truth already exists in another library or system, the department area keeps only the controlled working view, local tracker, or approved link index instead of copying the source record.</div>
<div class="keyline"><strong>Department data-layer rule:</strong> non-year data such as live boards, current queues, master lists, mappings, dashboard source views, open issue trackers, and controlled link indexes must stay in <span class="code">00-Live-Control-and-Master-Data</span> or the <span class="code">00-Current</span>/<span class="code">00-Active</span> branches. Only closed-period logs, periodic review outputs, frozen snapshots, and year-bound history go into <span class="code">{YYYY}</span>. Epicor or other system-of-record transactions are not manually dumped into SharePoint to replace the source system.</div>
<div class="figure-box">
  <p style="margin:0;" class="path">05-Department-Records/DEP-{CODE}/00-Live-Control-and-Master-Data/01-Current-Boards-and-Queues/</p>
  <p style="margin:4px 0 0;" class="path">05-Department-Records/DEP-{CODE}/00-Live-Control-and-Master-Data/02-Master-Lists-and-Mappings/</p>
  <p style="margin:4px 0 0;" class="path">05-Department-Records/DEP-{CODE}/00-Live-Control-and-Master-Data/03-Live-Dashboards-and-Source-Views/</p>
  <p style="margin:4px 0 0;" class="path">05-Department-Records/DEP-{CODE}/00-Live-Control-and-Master-Data/04-Open-Issues-and-Action-Trackers/</p>
  <p style="margin:4px 0 0;" class="path">05-Department-Records/DEP-{CODE}/00-Live-Control-and-Master-Data/05-Link-Indexes-and-Controlled-Views/</p>
</div>
'@

$annex133HeaderPattern = '<th>.*02-Operations / 03-Registers-and-Logs / 05-.*?</th>'
$annex133HeaderReplacement = '<th>required subfolders under 02-Operations / 03-Registers-and-Logs / 05-Interfaces-and-Released-Packs (used in both 00-Current and {YYYY} where applicable)</th>'

$annex134CreateDeptZonePattern = '<tr><td>CreateDepartmentZone</td><td>.+?</tr>'
$annex134CreateDeptZoneReplacement = '<tr><td>CreateDepartmentZone</td><td>Create the controlled root zone for one department in <span class="code">05-Department-Records</span>, including live/current/active/history branches.</td><td>DeptCode, PrimaryOwnerGroup</td><td>Department root, 00-Live-Control-and-Master-Data, 00-Current and 00-Active branches, fixed functional skeleton, zone URL</td></tr>'

$annex134CreateDeptYearPattern = '<tr><td>CreateDepartmentYearFolder</td><td>.+?</tr>'
$annex134CreateDeptYearReplacement = '<tr><td>CreateDepartmentYearFolder</td><td>Create the year container only inside the controlled year-based branches of a department zone.</td><td>DeptCode, Year</td><td>{YYYY} folders under Governance, Operations, Registers-and-Logs, Projects-and-Improvement, and Interfaces-and-Released-Packs</td></tr>'

$annex134DeptLibraryPattern = '<tr><td><span class="code">05-Ph.+?</tr>'
$annex134DeptLibraryReplacement = '<tr><td><span class="code">05-Department-Records</span></td><td>Department operating data, live control boards, current queues, master lists, local logs, periodic review packs, and released interface packs under one standard skeleton.</td><td>CreateDepartmentZone, CreateDepartmentYearFolder</td><td>Matching department owner group</td><td>The department root is not year-based. Non-year data stays in live/current/active branches; only closed-period history goes into {YYYY} branches. Do not use this as a raw dump of system-of-record transactions.</td></tr>'

$annex134DeptPathPattern = '<p style="margin:8px 0;">M.+?matrix\.</p>'
$annex134DeptPathReplacement = '<p style="margin:8px 0;">Every department zone is created under the root path <span class="code">05-Department-Records/{DeptCode}-{DepartmentName}/</span>. The flow first creates <span class="code">00-Live-Control-and-Master-Data</span>, then the fixed branches <span class="code">01-Governance</span>, <span class="code">02-Operations</span>, <span class="code">03-Registers-and-Logs</span>, <span class="code">04-Projects-and-Improvement</span>, <span class="code">05-Interfaces-and-Released-Packs</span>, and <span class="code">99-Archive</span>. Inside those branches it creates <span class="code">00-Current</span>, <span class="code">00-Active</span>, and <span class="code">{YYYY}</span> containers where applicable before adding the department-specific subfolders from the matrix.</p><div class="keyline"><strong>Operating-data rule:</strong> queues, current boards, master lists, mappings, dashboard source views, open action trackers, and active projects are not year folders. They stay in the live/current/active branches so the department can operate daily without moving files every year-end.</div>'

$annex134AlgorithmPattern = '<tr><td>CreateDepartmentZone / CreateDepartmentYearFolder</td><td>.+?</tr>'
$annex134AlgorithmReplacement = '<tr><td>CreateDepartmentZone / CreateDepartmentYearFolder</td><td>1) Validate DeptCode and owner group; 2) Create the department root if missing; 3) Create 00-Live-Control-and-Master-Data and the fixed branches 01/02/03/04/05/99; 4) Create 00-Current and 00-Active containers where required; 5) Create the {YYYY} containers only inside the year-based branches; 6) Add department-specific subfolders from the matrix into both current and yearly branches where applicable; 7) Apply group-based permissions; 8) Stamp metadata including FolderSegment; 9) Log URL and status.</td></tr>'

$wi102Pattern = '<li>V.+?05-Ph.+?thư mục\.</li>'
$wi102Replacement = '<li>With <span class="code">05-Department-Records</span>, create the department root first, then create <span class="code">00-Live-Control-and-Master-Data</span>, the <span class="code">00-Current</span>/<span class="code">00-Active</span> branches, and only after that create the <span class="code">{YYYY}</span> folders inside the year-based branches.</li>'

Replace-Regex -Path $annex133 -Pattern $annex133SectionPattern -Replacement $annex133SectionReplacement
Replace-Regex -Path $annex133 -Pattern $annex133HeaderPattern -Replacement $annex133HeaderReplacement
Replace-Regex -Path $annex134 -Pattern $annex134CreateDeptZonePattern -Replacement $annex134CreateDeptZoneReplacement
Replace-Regex -Path $annex134 -Pattern $annex134CreateDeptYearPattern -Replacement $annex134CreateDeptYearReplacement
Replace-Regex -Path $annex134 -Pattern $annex134DeptLibraryPattern -Replacement $annex134DeptLibraryReplacement
Replace-Regex -Path $annex134 -Pattern $annex134DeptPathPattern -Replacement $annex134DeptPathReplacement
Replace-Regex -Path $annex134 -Pattern $annex134AlgorithmPattern -Replacement $annex134AlgorithmReplacement
Replace-Regex -Path $wi102 -Pattern $wi102Pattern -Replacement $wi102Replacement
