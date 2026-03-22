$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$liveRoots = @(
    '02-Tai-Lieu-He-Thong',
    '03-Tai-Lieu-Van-Hanh',
    '10-Training-Academy',
    '11-Glossary'
)

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Get-RelativePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FullPath
    )

    return $FullPath.Substring($repoRoot.Length + 1)
}

function Get-ValueMatch {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Text,
        [Parameter(Mandatory = $true)]
        [string]$Pattern,
        [string]$Label = 'value'
    )

    $match = [regex]::Match(
        $Text,
        $Pattern,
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )

    if (-not $match.Success) {
        throw "Could not extract $Label using pattern: $Pattern"
    }

    return $match.Groups['value'].Value.Trim()
}

function Get-HtmlAudit {
    $files = foreach ($root in $liveRoots) {
        Get-ChildItem -Path (Join-Path $repoRoot $root) -Recurse -File -Filter *.html
    }

    $audit = foreach ($file in $files) {
        $raw = [System.IO.File]::ReadAllText($file.FullName)
        [pscustomobject]@{
            Path          = Get-RelativePath -FullPath $file.FullName
            HasFormHeader = $raw -match 'class="form-header"'
            HasHeroCard   = $raw -match 'class="hero\s+card"'
            HasRefresh    = $raw -match 'http-equiv="refresh"'
            HasPageWrap   = $raw -match 'class="page-wrap"'
            HasDocContent = $raw -match 'id="docContent"'
            HasAppJs      = $raw -match '<script src="\.\./\.\./\.\./assets/app\.js"></script>'
        }
    }

    return $audit
}

function Convert-HeroDoc {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FullPath
    )

    $raw = [System.IO.File]::ReadAllText($FullPath)

    if ($raw -notmatch 'class="hero\s+card"') {
        return $false
    }

    $bodyMatch = [regex]::Match(
        $raw,
        '(?s)<body>\s*<div class="page-wrap">\s*<div class="page-body">\s*<div class="hero card">(?<hero>.*?)</div>\s*(?<rest><div class="note">.*)\s*</div>\s*</div>\s*(?<disclaimer><div class="no-screen print-disclaimer">.*?</div>)?\s*</body>'
    )

    if (-not $bodyMatch.Success) {
        throw "Unexpected hero-card layout in $(Get-RelativePath -FullPath $FullPath)"
    }

    $hero = $bodyMatch.Groups['hero'].Value
    $rest = $bodyMatch.Groups['rest'].Value.Trim()
    $disclaimer = $bodyMatch.Groups['disclaimer'].Value.Trim()

    $docType = Get-ValueMatch -Text $hero -Pattern '<div class="doc-type">(?<value>.*?)</div>' -Label 'doc type'
    $docTitle = Get-ValueMatch -Text $hero -Pattern '<div class="doc-title"[^>]*>(?<value>.*?)</div>' -Label 'doc title'

    $metaMatches = [regex]::Matches(
        $hero,
        '<div class="row"><span><b>.*?</b></span><span>(?<value>.*?)</span></div>',
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )

    if ($metaMatches.Count -ne 5) {
        throw "Expected 5 metadata rows in $(Get-RelativePath -FullPath $FullPath), found $($metaMatches.Count)"
    }

    $metaValues = @($metaMatches | ForEach-Object { $_.Groups['value'].Value.Trim() })

    $header = @"
      <div class="form-header">
        <div class="fh-left">
          <a class="brand-logo" href="../../../01-QMS-Portal/portal.html"><img alt="HESEM Logo" src="../../../assets/hesem-logo.svg"/></a>
          <div class="fh-company">
            <a href="../../../01-QMS-Portal/portal.html">HESEM ENGINEERING</a>
            <span>$docType</span>
          </div>
        </div>
        <div class="title"><strong>$docTitle</strong></div>
        <div class="meta">
          <div class="row"><span><b>M&#227;:</b></span><span>$($metaValues[0])</span></div>
          <div class="row"><span><b>Phi&#234;n b&#7843;n:</b></span><span>$($metaValues[1])</span></div>
          <div class="row"><span><b>Ng&#224;y hi&#7879;u l&#7921;c:</b></span><span>$($metaValues[2])</span></div>
          <div class="row"><span><b>Ch&#7911; s&#7903; h&#7919;u:</b></span><span>$($metaValues[3])</span></div>
          <div class="row"><span><b>Ph&#234; duy&#7879;t:</b></span><span>$($metaValues[4])</span></div>
        </div>
      </div>
"@

    $newBody = @"
<body>
<div class="container">
  <div class="page">
    <div class="page-body">
$header
      <div class="doc-content" id="docContent"><div class="form-sheet">
$rest
      </div></div>
    </div>
  </div>
</div>
$disclaimer
<script src="../../../assets/app.js"></script>
</body>
"@

    $newHtml = $raw.Substring(0, $bodyMatch.Index) + $newBody + $raw.Substring($bodyMatch.Index + $bodyMatch.Length)
    [System.IO.File]::WriteAllText($FullPath, $newHtml, $utf8NoBom)
    return $true
}

$before = Get-HtmlAudit
$heroDocs = $before | Where-Object { $_.HasHeroCard }

if (-not $heroDocs) {
    Write-Output 'No hero-card controlled docs found.'
    exit 0
}

$updated = foreach ($doc in $heroDocs) {
    $fullPath = Join-Path $repoRoot $doc.Path
    if (Convert-HeroDoc -FullPath $fullPath) {
        $doc.Path
    }
}

$after = Get-HtmlAudit

Write-Output "Updated hero-card docs: $($updated.Count)"
$updated | ForEach-Object { Write-Output " - $_" }

$remainingHero = @($after | Where-Object { $_.HasHeroCard })
$missingHeader = @($after | Where-Object { -not $_.HasFormHeader -and -not $_.HasRefresh })
$missingDocContent = @($after | Where-Object { $_.HasFormHeader -and -not $_.HasDocContent })
$missingAppJs = @($after | Where-Object { $_.HasFormHeader -and -not $_.HasAppJs })

Write-Output "Remaining hero-card docs: $($remainingHero.Count)"
Write-Output "Non-refresh HTML files still missing form-header: $($missingHeader.Count)"
Write-Output "Form-header docs still missing docContent: $($missingDocContent.Count)"
Write-Output "Form-header docs still missing app.js: $($missingAppJs.Count)"
