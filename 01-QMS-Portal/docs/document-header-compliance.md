# Document Header Compliance

Updated: 2026-03-22

## Required structure for controlled HTML docs

Every controlled HTML document should include all three runtime markers below:

1. `class="form-header"`
2. `id="docContent"`
3. `<script src="../../../assets/app.js"></script>`

These markers are required so the portal viewer can:

- render the controlled header consistently
- extract the document body through `docContent`
- keep document-side runtime behaviors aligned with the viewer

## What is excluded

The following pages are not treated as controlled-doc failures when they do not have the standard header:

- redirect stubs using `meta http-equiv="refresh"`
- section index pages such as folder landing pages

## 2026-03-22 repair scope

The audit found 5 controlled docs using the legacy `hero card` layout instead of the standard header:

- `03-Tai-Lieu-Van-Hanh/02-Work-Instructions/07-WI-700/wi-715-helium-leak-test-standard-work.html`
- `03-Tai-Lieu-Van-Hanh/02-Work-Instructions/07-WI-700/wi-716-vacuum-compatible-clean-build-and-bagging.html`
- `03-Tai-Lieu-Van-Hanh/02-Work-Instructions/08-WI-800/wi-801-cnc-poka-yoke-examples.html`
- `03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-System/annex-hr-001-competency-levels-and-certification-rules.html`
- `03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-System/annex-qms-022-poka-yoke-cnc-examples.html`

All 5 were normalized to:

- `form-header`
- `doc-content` / `docContent`
- `assets/app.js`

## Audit command

Use this to find non-redirect HTML files that still miss the standard header:

```powershell
$roots = @('02-Tai-Lieu-He-Thong','03-Tai-Lieu-Van-Hanh','10-Training-Academy','11-Glossary')
$files = foreach ($root in $roots) { Get-ChildItem -Path $root -Recurse -File -Filter *.html }
$files | ForEach-Object {
  $raw = Get-Content -Path $_.FullName -Raw
  if ($raw -notmatch 'class="form-header"' -and $raw -notmatch 'http-equiv="refresh"') {
    $_.FullName.Substring((Get-Location).Path.Length + 1)
  }
}
```

## Repair command

For hero-card controlled docs, use:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\fix-controlled-doc-headers.ps1
```

## Maintenance rule for future imports

If a new package introduces a custom hero block, do not ship it as-is.

Normalize it before release so the final HTML uses the same controlled-doc shell as the rest of the library.
