<#
.SYNOPSIS
    Provision HESEM M365/SharePoint tenant from the canonical folder blueprint.

.DESCRIPTION
    Reads tools/m365-provisioning/blueprint/ filesystem tree + manifest.json
    and creates the equivalent site/library/folder structure on a SharePoint
    Online tenant. Idempotent: re-running skips existing entities. Honors
    placeholder paths ({CustomerID}, {PartNo}, etc.) by NOT materializing
    them — those become template patterns documented in metadata, instantiated
    at runtime by ANNEX-134 provisioning flows.

    Canonical sources:
      mom/docs/operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/
        annex-133-m365-records-site-topology-library-and-folder-blueprint.html
        annex-139-m365-ip-and-restricted-library-internal-blueprint.html

.PARAMETER TenantUrl
    Root tenant URL, e.g. https://hesem.sharepoint.com

.PARAMETER BlueprintRoot
    Path to the blueprint directory. Default: ./blueprint (relative to script).

.PARAMETER DryRun
    Switch. If set, prints every operation but does not call PnP cmdlets.
    Default true until explicitly cleared with -DryRun:$false on real run.

.PARAMETER SiteToProvision
    Optional. Limit provisioning to one site (e.g. HESEM-Records). If empty,
    provision all 4 sites + 2 cross-site libraries.

.PARAMETER SkipPlaceholders
    Switch. Default true. When true, folders whose name contains "{...}" are
    treated as templates and NOT materialized on the tenant.

.EXAMPLE
    # Dry-run preview (default)
    pwsh ./Provision-HesemTenant.ps1 -TenantUrl https://hesem.sharepoint.com

.EXAMPLE
    # Real provisioning — explicit -DryRun:$false
    pwsh ./Provision-HesemTenant.ps1 -TenantUrl https://hesem.sharepoint.com -DryRun:$false

.NOTES
    Requires PnP.PowerShell module installed (Install-Module PnP.PowerShell).
    Tenant admin credentials must be configured via Connect-PnPOnline before
    invoking; this script does NOT embed credentials.

    Permission groups + break-inheritance + sensitivity labels are NOT applied
    by this script — those flow through ANNEX-134 provisioning automation
    (M365-Record-Provisioning-Requests + Power Automate). This script only
    materializes the file-system shape.

.LINK
    ANNEX-133 §2  — site/library topology
    ANNEX-134 §5  — RequestType catalog
    ANNEX-139 §2-§8 — internal L2/L3 blueprint
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$TenantUrl,

    [string]$BlueprintRoot = (Join-Path $PSScriptRoot "blueprint"),

    [switch]$DryRun = $true,

    [string]$SiteToProvision = "",

    [switch]$SkipPlaceholders = $true
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# ---------------------------------------------------------------------------
# Site-name -> SharePoint site URL suffix mapping (per ANNEX-133 §2 keyline).
# ---------------------------------------------------------------------------
$SiteMap = @{
    "HESEM-Records"      = "sites/hesem-records"
    "HESEM-Job-Evidence" = "sites/hesem-job-evidence"
    "HESEM-People"       = "sites/hesem-people"
    "HESEM-Digital"      = "sites/hesem-digital"
}

# Cross-site libraries (06-Archive, 07-Working-Templates) are provisioned in
# HESEM-Records by default (single tenant-wide archive + templates store).
$CrossSiteHomes = @{
    "06-Archive"          = "HESEM-Records"
    "07-Working-Templates" = "HESEM-Records"
}

# Site template ID for plain Team site without M365 Group (recommended for
# records sites per ANNEX-134 §3 — group-less sites avoid stray Teams).
$SiteTemplate = "STS#3"

# ---------------------------------------------------------------------------
# Logging helpers
# ---------------------------------------------------------------------------
function Write-Plan { param([string]$msg) Write-Host "[PLAN ] $msg" -ForegroundColor Cyan }
function Write-Do   { param([string]$msg) Write-Host "[DO   ] $msg" -ForegroundColor Green }
function Write-Skip { param([string]$msg) Write-Host "[SKIP ] $msg" -ForegroundColor Yellow }
function Write-Err  { param([string]$msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }

# ---------------------------------------------------------------------------
# Placeholder detector — paths containing {...} are templates (don't create).
# ---------------------------------------------------------------------------
function Test-IsPlaceholder {
    param([string]$folderName)
    return ($folderName -match '\{.*\}')
}

# ---------------------------------------------------------------------------
# Load manifest.json for library counts + token catalog
# ---------------------------------------------------------------------------
$manifestPath = Join-Path $BlueprintRoot "manifest.json"
if (-not (Test-Path $manifestPath)) {
    Write-Err "manifest.json not found at $manifestPath"
    exit 1
}
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
Write-Host ""
Write-Host "Loaded manifest: version $($manifest.blueprint_version)" -ForegroundColor Magenta
Write-Host "Canonical sources:" -ForegroundColor Magenta
$manifest.canonical_source | ForEach-Object { Write-Host "  - $_" -ForegroundColor Magenta }
Write-Host ""

# ---------------------------------------------------------------------------
# Ensure PnP module is available (unless DryRun)
# ---------------------------------------------------------------------------
if (-not $DryRun) {
    if (-not (Get-Module -ListAvailable -Name PnP.PowerShell)) {
        Write-Err "PnP.PowerShell module not installed. Install: Install-Module PnP.PowerShell -Scope CurrentUser"
        exit 1
    }
    Import-Module PnP.PowerShell -ErrorAction Stop
}

# ---------------------------------------------------------------------------
# Site creation
# ---------------------------------------------------------------------------
function Invoke-EnsureSite {
    param(
        [string]$SiteName,
        [string]$UrlSuffix
    )
    $url = "$TenantUrl/$UrlSuffix"
    Write-Plan "Site '$SiteName' -> $url"

    if ($DryRun) {
        Write-Skip "  [dry-run] would New-PnPSite -Type TeamSiteWithoutMicrosoft365Group -Title '$SiteName' -Url '$url'"
        return $url
    }

    try {
        $existing = Get-PnPTenantSite -Url $url -ErrorAction SilentlyContinue
        if ($existing) {
            Write-Skip "  Site exists: $url"
        }
        else {
            New-PnPSite -Type TeamSiteWithoutMicrosoft365Group `
                -Title $SiteName `
                -Url $url `
                -Description "HESEM M365 records site — managed by tools/m365-provisioning"
            Write-Do "  Created site: $url"
        }
    }
    catch {
        Write-Err "  Site creation failed: $($_.Exception.Message)"
        throw
    }
    return $url
}

# ---------------------------------------------------------------------------
# Library creation (top-level folder under a site -> document library)
# ---------------------------------------------------------------------------
function Invoke-EnsureLibrary {
    param(
        [string]$SiteUrl,
        [string]$LibraryName
    )
    Write-Plan "  Library '$LibraryName' in $SiteUrl"

    if ($DryRun) {
        Write-Skip "    [dry-run] would New-PnPList -Title '$LibraryName' -Template DocumentLibrary"
        return
    }

    try {
        Connect-PnPOnline -Url $SiteUrl -Interactive -ErrorAction Stop
        $existing = Get-PnPList -Identity $LibraryName -ErrorAction SilentlyContinue
        if ($existing) {
            Write-Skip "    Library exists: $LibraryName"
        }
        else {
            New-PnPList -Title $LibraryName -Template DocumentLibrary
            Write-Do "    Created library: $LibraryName"
        }
    }
    catch {
        Write-Err "    Library creation failed: $($_.Exception.Message)"
        throw
    }
}

# ---------------------------------------------------------------------------
# Folder creation (within a library, recursive)
# ---------------------------------------------------------------------------
function Invoke-EnsureFolder {
    param(
        [string]$SiteUrl,
        [string]$LibraryName,
        [string]$RelativePath   # path inside library, e.g. "01-Sub/00-Current/2026"
    )
    $folderName = Split-Path $RelativePath -Leaf
    if ($SkipPlaceholders -and (Test-IsPlaceholder $folderName)) {
        Write-Skip "      Placeholder skipped: $LibraryName/$RelativePath"
        return
    }

    Write-Plan "      Folder $LibraryName/$RelativePath"

    if ($DryRun) {
        Write-Skip "        [dry-run] would Add-PnPFolder -Folder '$LibraryName' -Name '$RelativePath'"
        return
    }

    try {
        # PnP Add-PnPFolder needs parent existing first; build incrementally.
        $segments = $RelativePath -split '/'
        $parent = $LibraryName
        foreach ($seg in $segments) {
            if ($SkipPlaceholders -and (Test-IsPlaceholder $seg)) {
                # Stop descending at first placeholder — template branches don't
                # get a physical folder, only the metadata catalog row.
                return
            }
            $full = "$parent/$seg"
            $existing = Get-PnPFolder -Url $full -ErrorAction SilentlyContinue
            if (-not $existing) {
                Add-PnPFolder -Folder $parent -Name $seg | Out-Null
                Write-Do "        Created folder: $full"
            }
            $parent = $full
        }
    }
    catch {
        Write-Err "      Folder creation failed: $($_.Exception.Message)"
        # Continue with next folder — provisioning is best-effort idempotent.
    }
}

# ---------------------------------------------------------------------------
# Walk blueprint directory tree
# ---------------------------------------------------------------------------
function Invoke-ProvisionFromTree {
    param(
        [string]$SiteName,
        [string]$SiteUrl,
        [string]$SiteFolderPath  # absolute path on disk
    )

    # Top-level entries inside the site folder become document libraries.
    Get-ChildItem -Path $SiteFolderPath -Directory | ForEach-Object {
        $libraryName = $_.Name
        Invoke-EnsureLibrary -SiteUrl $SiteUrl -LibraryName $libraryName

        # Walk all descendants for folder paths.
        $libRoot = $_.FullName
        Get-ChildItem -Path $libRoot -Directory -Recurse | ForEach-Object {
            $rel = $_.FullName.Substring($libRoot.Length + 1).Replace('\','/')
            Invoke-EnsureFolder -SiteUrl $SiteUrl -LibraryName $libraryName -RelativePath $rel
        }
    }
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
Write-Host "=== HESEM M365 Tenant Provisioning ===" -ForegroundColor Magenta
Write-Host "Tenant       : $TenantUrl" -ForegroundColor Magenta
Write-Host "Blueprint    : $BlueprintRoot" -ForegroundColor Magenta
Write-Host "DryRun       : $DryRun" -ForegroundColor Magenta
Write-Host "Site filter  : $(if ($SiteToProvision) { $SiteToProvision } else { '(all)' })" -ForegroundColor Magenta
Write-Host ""

$sites = $SiteMap.Keys
if ($SiteToProvision) {
    $sites = $sites | Where-Object { $_ -eq $SiteToProvision }
    if (-not $sites) {
        Write-Err "Unknown site: $SiteToProvision"
        exit 1
    }
}

foreach ($siteName in $sites) {
    $sitePath = Join-Path $BlueprintRoot $siteName
    if (-not (Test-Path $sitePath)) {
        Write-Skip "Site folder not in blueprint: $sitePath"
        continue
    }

    $siteUrl = Invoke-EnsureSite -SiteName $siteName -UrlSuffix $SiteMap[$siteName]
    Invoke-ProvisionFromTree -SiteName $siteName -SiteUrl $siteUrl -SiteFolderPath $sitePath
}

# Cross-site libraries (06-Archive, 07-Working-Templates) — provision into
# their designated home site.
if (-not $SiteToProvision -or $CrossSiteHomes.ContainsValue($SiteToProvision)) {
    foreach ($lib in $CrossSiteHomes.Keys) {
        $libPath = Join-Path $BlueprintRoot $lib
        if (-not (Test-Path $libPath)) {
            Write-Skip "Cross-site library folder not in blueprint: $libPath"
            continue
        }
        $homeSite = $CrossSiteHomes[$lib]
        if ($SiteToProvision -and $homeSite -ne $SiteToProvision) { continue }
        $homeSiteUrl = "$TenantUrl/$($SiteMap[$homeSite])"
        Write-Plan "Cross-site library '$lib' -> home site '$homeSite' ($homeSiteUrl)"

        Invoke-EnsureLibrary -SiteUrl $homeSiteUrl -LibraryName $lib
        Get-ChildItem -Path $libPath -Directory -Recurse | ForEach-Object {
            $rel = $_.FullName.Substring($libPath.Length + 1).Replace('\','/')
            Invoke-EnsureFolder -SiteUrl $homeSiteUrl -LibraryName $lib -RelativePath $rel
        }
    }
}

Write-Host ""
Write-Host "=== Provisioning complete ===" -ForegroundColor Magenta
if ($DryRun) {
    Write-Host "(dry-run: no tenant changes applied. Re-run with -DryRun:`$false to apply.)" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Next steps NOT covered by this script:" -ForegroundColor Magenta
Write-Host "  1. Permission groups (HESEM-* Entra ID groups per Standard-14 §7)" -ForegroundColor Magenta
Write-Host "  2. Break-inheritance for restricted zones:" -ForegroundColor Magenta
Write-Host "     - Customer-Received/03-Restricted-Export-Control (CMMC L2)" -ForegroundColor Magenta
Write-Host "     - HR-Operations/04-Compensation-Bands-Restricted" -ForegroundColor Magenta
Write-Host "     - Employee-Records/.../06-Payroll, /08-Medical, /11-Disciplinary, /13-Sealed" -ForegroundColor Magenta
Write-Host "  3. External sharing OFF at SITE 2 + 3 (per Standard-14 §4.5)" -ForegroundColor Magenta
Write-Host "  4. Retention labels (per ANNEX-131 RetentionLabel field)" -ForegroundColor Magenta
Write-Host "  5. Metadata columns + content types (per ANNEX-131 §3-§5)" -ForegroundColor Magenta
Write-Host "  6. ANNEX-134 automation flows (Power Automate runtime provisioning" -ForegroundColor Magenta
Write-Host "     for job dossiers, employee dossiers, asset records on demand)" -ForegroundColor Magenta
