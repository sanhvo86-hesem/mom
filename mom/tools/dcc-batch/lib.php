<?php

declare(strict_types=1);

/**
 * DCC Batch Migration — Shared Library
 * ====================================
 *
 * Utilities for migrating, auditing, and remediating the canonical DCC
 * (Document Change Control) header pattern across all `mom/docs/**`
 * controlled documents.
 *
 * The pattern itself is the contract that every controlled HTML document
 * must satisfy:
 *
 *   1. **Head bootstrap script** — injects the DCC stylesheet + renderer
 *      with a cache-busting query string. Must appear once, after `<title>`.
 *
 *   2. **Body placeholder** — `<div class="dcc-header" data-dcc-doc-code="…">`
 *      sits at the top of `<div class="page-body">` and is rendered by
 *      `11-dcc-header-renderer.js`. Replaces any legacy `<div class="form-header">`.
 *
 *   3. **DB row** — `dcc_document_header` row keyed on the canonical code
 *      (e.g. `QMS-MAN-001`) holds the editable title / subtitle / metadata.
 *      The renderer fetches this via `/api/v1/dcc/documents/{code}/header`.
 *
 * This file exposes pure functions — no I/O wrappers — so it can be
 * unit-tested and re-used by both the audit and the migrate scripts.
 *
 * @since 4.1.0
 */

namespace MOM\Tools\DccBatch;

/* ── Constants ─────────────────────────────────────────────────────────── */

/** The cache-bust version stamp baked into the head bootstrap. */
const DCC_VERSION = '2026-04-23-1';

/** Comment that flags the placeholder; lets us locate it idempotently. */
const DCC_PLACEHOLDER_COMMENT = '<!-- DCC Document Change Control header (values served by /api/v1/dcc; bootstrap seed is preview-only) -->';

/** Marker that lets us locate the bootstrap script idempotently. */
const DCC_BOOTSTRAP_MARKER = '/* DCC Header bootstrap';

/** Default locale for the placeholder. Vietnamese for HESEM. */
const DCC_DEFAULT_LOCALE = 'vi';

/** Roots inside the docs tree we never touch. */
const SKIP_PATH_FRAGMENTS = [
    '/_Archive/',
    '/glossary/',
    // Note: training/templates/ ARE controlled docs and must be migrated.
];

/** File patterns we skip even inside controlled folders. */
const SKIP_FILENAME_PATTERNS = [
    '/^index\.html?$/i',           // folder index pages have their own layout
    '/^README\.html?$/i',
    '/^_/',                         // underscore-prefixed = scaffolding
];

/* ── Filesystem walker ─────────────────────────────────────────────────── */

/**
 * File extensions we treat as controlled documents.
 *
 * Scope: HTML only. Excel forms (.xlsx etc.) are NOT migrated — they cannot
 * host an inline `<script>` and the user has explicitly scoped this tool to
 * HTML documents. Excel forms continue to use the legacy
 * doc_descriptions.json + scan_cache flow for the listing card.
 */
const CONTROLLED_EXTENSIONS = ['html'];

/**
 * Yield every controlled file under `mom/docs/`.
 *
 * Includes HTML (which gets full DCC header injection) AND Excel forms
 * (which get a DB row only — they can't host an inline HTML script).
 * Use `is_html_path()` to discriminate.
 *
 * @return \Generator<string>  Absolute paths.
 */
function walk_docs(string $rootDir): \Generator
{
    $base = rtrim($rootDir, '/') . '/mom/docs';
    if (!is_dir($base)) {
        return;
    }
    $iter = new \RecursiveIteratorIterator(
        new \RecursiveDirectoryIterator($base, \FilesystemIterator::SKIP_DOTS | \FilesystemIterator::UNIX_PATHS),
        \RecursiveIteratorIterator::LEAVES_ONLY
    );
    foreach ($iter as $f) {
        if (!$f->isFile()) continue;
        if (!in_array(strtolower($f->getExtension()), CONTROLLED_EXTENSIONS, true)) continue;
        $abs  = (string)$f->getPathname();
        $name = $f->getFilename();
        $relativeFromBase = substr($abs, strlen($base));
        foreach (SKIP_PATH_FRAGMENTS as $frag) {
            if (stripos($relativeFromBase, $frag) !== false) {
                continue 2;
            }
        }
        foreach (SKIP_FILENAME_PATTERNS as $pat) {
            if (preg_match($pat, $name)) {
                continue 2;
            }
        }
        yield $abs;
    }
}

function is_html_path(string $absPath): bool
{
    return strtolower(pathinfo($absPath, PATHINFO_EXTENSION)) === 'html';
}

/**
 * Try to derive a code for files whose names don't match our standard
 * filename patterns. Excel forms use SHOUTY underscored names like
 *   `FRM-101_Master_Document_Register.xlsx`
 * which `code_from_filename` already handles via the FRM-NNN pattern, but
 * some legacy entries use lower-cased names — normalise them first.
 */
function code_from_filename_loose(string $absPath): string
{
    $code = code_from_filename($absPath);
    if ($code !== '') return $code;
    // Fallback: take the leading SHOUTY token before the first underscore
    $stem = strtoupper((string)preg_replace('/\.[^.]+$/', '', basename($absPath)));
    if (preg_match('/^([A-Z]+-\d+)/', $stem, $m)) return $m[1];
    return '';
}

/**
 * Read a doc-descriptions sidecar JSON (legacy doc_descriptions.json) and
 * return a code → description map. Used as a fallback subtitle source for
 * Excel forms that have no `<span class="sub-vn">` to scrape.
 */
function load_doc_descriptions(string $rootDir): array
{
    $file = rtrim($rootDir, '/') . '/mom/data/config/doc_descriptions.json';
    if (!is_file($file)) return [];
    $raw  = @file_get_contents($file);
    $data = $raw === false ? null : json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/* ── Code derivation (mirrors DocumentControlService::canonicalizeCode) ── */

/** Same patterns as `scan_extract_code()` and `deriveDocCodeFromPath()`. */
const CODE_PATTERNS = [
    '/^(SOP-\d{3})/',
    '/^(FRM-\d{3})/',
    '/^(WI-\d{3})/',
    '/^(ANNEX-\d{3})/',
    '/^(REF-\d{3})/',
    '/^(QMS-MAN-\d+)/',
    '/^(QMS-GDL-\d+)/',
    '/^(POL-QMS-\d+)/',
    '/^(FRM-HR-JD-[A-Z]+-\d+)/',
    '/^(FRM-HR-TRN-\d+)/',
    '/^(ANNEX-DEP-[A-Z]+-\d+)/',
    '/^(ANNEX-(?:JOB|ORG)-\d+)/',
    '/^(ANNEX-HR-LAB-\d+)/',
    '/^((?:SOP|PROC|WI|FRM|ANNEX|POL|QMS|DEPT)-[A-Z]+-\d+)/',
    '/^(JD-[A-Z0-9-]+)/',
    '/^(DEPT-[A-Z0-9-]+)/',
    '/^(RACI-[A-Z0-9-]+)/',
    '/^(AUTHORITY-[A-Z0-9-]+)/',
];

function code_from_filename(string $absPath): string
{
    $base = basename($absPath);
    $stem = strtoupper(preg_replace('/\.[^.]+$/', '', $base) ?? $base);
    foreach (CODE_PATTERNS as $pattern) {
        if (preg_match($pattern, $stem, $m)) {
            return $m[1];
        }
    }
    // Fallback: sanitise stem
    $sanitised = preg_replace('/[^A-Z0-9-]+/', '-', $stem) ?? $stem;
    $sanitised = preg_replace('/-+/', '-', $sanitised) ?? $sanitised;
    return trim((string)$sanitised, '-');
}

/** Derive the doc_type enum value from a canonical code. */
function doc_type_from_code(string $code): string
{
    $u = strtoupper($code);
    if (str_starts_with($u, 'QMS-MAN')) return 'MAN';
    if ($u === 'POL' || str_starts_with($u, 'POL-')) return 'POL';
    if (str_starts_with($u, 'SOP-'))    return 'SOP';
    if (str_starts_with($u, 'WI-'))     return 'WI';
    if (str_starts_with($u, 'ANNEX-'))  return 'ANNEX';
    if (str_starts_with($u, 'FRM-'))    return 'FRM';
    if (str_starts_with($u, 'JD-'))     return 'JD';
    if (str_starts_with($u, 'DEPT-'))   return 'DEPT';
    if (str_starts_with($u, 'ORG-'))    return 'ORG';
    if (str_starts_with($u, 'RACI-'))   return 'ORG';
    if (str_starts_with($u, 'TRN'))     return 'TRN';
    return 'REF';
}

/* ── Title / subtitle extraction from existing HTML ────────────────────── */

/**
 * Extract the human-readable title from an existing HTML file. Tries (in
 * order): <title> tag, <h1>, legacy `<strong class="doc-name">`, filename.
 * Always strips a leading "<CODE> - " or "<CODE> — " prefix.
 */
function extract_title(string $html, string $code, string $absPath): string
{
    $patterns = [
        '/<strong[^>]*class=["\'][^"\']*\bdoc-name\b[^"\']*["\'][^>]*>(.*?)<\/strong>/isu',
        '/<h1\b[^>]*>(.*?)<\/h1>/isu',
        '/<h2\b[^>]*>(.*?)<\/h2>/isu',
        '/<title[^>]*>(.*?)<\/title>/isu',
    ];
    foreach ($patterns as $p) {
        if (preg_match($p, $html, $m)) {
            $candidate = clean_text((string)$m[1]);
            $candidate = strip_code_prefix($candidate, $code);
            $candidate = strip_brand_suffix($candidate);
            if ($candidate !== '' && strtoupper($candidate) !== strtoupper($code)) {
                return $candidate;
            }
        }
    }
    // Special case: competency-level pages like `C12-L4.html` live inside a
    // folder named `12-C12-Estimating-Costing/` — derive the title from that
    // parent folder + the level number, e.g. "Estimating Costing — Level 4".
    if (preg_match('/^C\d+-L(\d+)$/i', $code, $cm)) {
        $level  = (int)$cm[1];
        $parent = basename(dirname($absPath));
        // Strip leading `NN-CXX-` prefix
        $name = preg_replace('/^\d{2}-C\d+-/', '', $parent) ?? $parent;
        if ($name !== '' && $name !== $parent) {
            $words = array_map('ucfirst', explode('-', strtolower($name)));
            return trim(implode(' ', $words)) . ' — Level ' . $level;
        }
    }
    // Fallback: derive from filename stem
    $stem = preg_replace('/\.[^.]+$/', '', basename($absPath)) ?? basename($absPath);
    $stem = strtoupper((string)$stem);
    $stem = preg_replace('/^' . preg_quote($code, '/') . '-?/', '', $stem) ?? $stem;
    if ($stem === '') return $code;
    $words = explode('-', strtolower((string)$stem));
    $words = array_map('ucfirst', $words);
    return trim(implode(' ', $words));
}

/**
 * Extract the Vietnamese subtitle from an existing HTML file. Tries (in
 * order): legacy `<span class="sub-vn">`, then null when nothing meaningful.
 */
function extract_subtitle(string $html): ?string
{
    if (preg_match('/<span[^>]*class=["\'][^"\']*\bsub-vn\b[^"\']*["\'][^>]*>(.*?)<\/span>/isu', $html, $m)) {
        $candidate = clean_text((string)$m[1]);
        if ($candidate !== '') return $candidate;
    }
    return null;
}

function clean_text(string $s): string
{
    $s = preg_replace('/<[^>]+>/u', ' ', $s) ?? $s;
    $s = html_entity_decode((string)$s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $s = preg_replace('/\s+/u', ' ', $s) ?? $s;
    return trim((string)$s);
}

function strip_code_prefix(string $text, string $code): string
{
    $codeNorm = strtoupper(trim($code));
    if ($codeNorm === '') return $text;
    return trim(preg_replace('/^' . preg_quote($codeNorm, '/') . '\s*[—\-:]\s*/u', '', $text, 1) ?? $text);
}

function strip_brand_suffix(string $text): string
{
    return trim(preg_replace('/\s*\|\s*HESEM(?:\s+MOM)?\s*$/u', '', $text, 1) ?? $text);
}

/* ── Pattern detection ─────────────────────────────────────────────────── */

function has_dcc_bootstrap(string $html): bool
{
    return strpos($html, DCC_BOOTSTRAP_MARKER) !== false;
}

function has_dcc_placeholder(string $html): bool
{
    return preg_match('/<div[^>]*class=["\'][^"\']*\bdcc-header\b[^"\']*["\'][^>]*data-dcc-doc-code/i', $html) === 1;
}

function extract_placeholder_code(string $html): ?string
{
    if (preg_match('/<div[^>]*class=["\'][^"\']*\bdcc-header\b[^"\']*["\'][^>]*data-dcc-doc-code\s*=\s*["\']([^"\']+)["\']/i', $html, $m)) {
        return strtoupper(trim($m[1]));
    }
    return null;
}

function has_legacy_form_header(string $html): bool
{
    return preg_match('/<div[^>]*class=["\'][^"\']*\bform-header\b[^"\']*["\']/i', $html) === 1;
}

function has_legacy_title_block_outside_dcc(string $html): bool
{
    // Strip the DCC placeholder from a copy of the document, then look for
    // legacy `<div class="title"><strong class="doc-name">` blocks.
    $stripped = preg_replace(
        '/<div[^>]*class=["\'][^"\']*\bdcc-header\b[^"\']*["\'][^>]*>.*?<\/div>/isu',
        '',
        $html
    ) ?? $html;
    return preg_match('/<div[^>]*class=["\'][^"\']*\btitle\b[^"\']*["\'][^>]*>\s*<strong[^>]*class=["\'][^"\']*\bdoc-name\b[^"\']*["\']/isu', $stripped) === 1;
}

/* ── Pattern construction ──────────────────────────────────────────────── */

function build_bootstrap_script(): string
{
    $version = DCC_VERSION;
    return <<<HTML
<script>
/* DCC Header bootstrap — computes absolute URLs from location.pathname so the
 * stylesheet + renderer load correctly regardless of how the document is
 * served (direct, portal iframe + <base href="../"> injection, doc_stream, …).
 * The explicit `?v=…` query string busts browser + service-worker caches
 * whenever the DCC header CSS or renderer ships a new revision. */
(function () {
  var DCC_VERSION = '{$version}';
  var appBase = (location.pathname.indexOf('/mom/') === 0) ? '/mom' : '';
  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = appBase + '/styles/dcc-header.css?v=' + DCC_VERSION;
  css.setAttribute('data-dcc-header-stylesheet', '1');
  document.head.appendChild(css);
  var js = document.createElement('script');
  js.defer = true;
  js.src = appBase + '/scripts/portal/11-dcc-header-renderer.js?v=' + DCC_VERSION;
  document.head.appendChild(js);
})();
</script>
HTML;
}

/**
 * Compute the relative `../../../assets/hesem-logo.svg` path from a doc to
 * the assets root, based on its depth under `mom/docs/`.
 */
function logo_path_for(string $absPath, string $rootDir): string
{
    $rel = substr($absPath, strlen(rtrim($rootDir, '/')) + 1);
    // strip leading `mom/docs/` then count remaining slashes
    $rel = preg_replace('#^mom/docs/#', '', $rel) ?? $rel;
    $depth = substr_count((string)$rel, '/');  // depth from docs root to file
    // From docs/<...>/file.html to mom/assets/ requires going up depth+1 then down to assets
    // mom/docs/<...>/file.html  → ../../assets if 1 subdir, etc.
    // The logo lives at mom/assets/hesem-logo.svg, docs lives at mom/docs/, so from docs/<a>/<b>/file we need ../../../assets
    $up = str_repeat('../', $depth + 1);
    return $up . 'assets/hesem-logo.svg';
}

/**
 * Build the body placeholder. Bootstrap seed is best-effort; the renderer
 * will overwrite from the API once it loads.
 */
function build_placeholder(string $code, string $title, ?string $subtitle, string $logoPath, string $locale = DCC_DEFAULT_LOCALE): string
{
    $seed = [
        'header' => [
            'doc_code'           => $code,
            'title'              => $title,
            'subtitle'           => $subtitle,
            'doc_type'           => doc_type_from_code($code),
            'revision'           => 'V0',
            'effective_date'     => date('Y-m-d'),
            'owner_role_code'    => 'QA',
            'approver_role_code' => 'CEO',
            'iso_clause'         => null,
            'status'             => 'draft',
        ],
        'labels' => [
            'doc_id'         => ['short' => 'ID',    'long' => 'Document ID',     'sort' => 10],
            'revision'       => ['short' => 'Rev',   'long' => 'Revision',        'sort' => 20],
            'effective_date' => ['short' => 'Eff',   'long' => 'Effective date',  'sort' => 30],
            'owner'          => ['short' => 'Owner', 'long' => 'Owner',           'sort' => 40],
            'approver'       => ['short' => 'Appr',  'long' => 'Approved by',     'sort' => 50],
        ],
    ];
    // JSON inside an HTML attribute — encode quotes safely. Use single-quoted attr.
    $seedJson = json_encode($seed, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($seedJson)) $seedJson = '{}';
    $seedAttr = htmlspecialchars($seedJson, ENT_QUOTES, 'UTF-8');
    $codeAttr  = htmlspecialchars($code,    ENT_QUOTES, 'UTF-8');
    $localeAttr = htmlspecialchars($locale, ENT_QUOTES, 'UTF-8');
    $logoAttr  = htmlspecialchars($logoPath, ENT_QUOTES, 'UTF-8');

    $marker = DCC_PLACEHOLDER_COMMENT;
    return <<<HTML
{$marker}
<div class="dcc-header"
     data-dcc-doc-code="{$codeAttr}"
     data-dcc-locale="{$localeAttr}"
     data-dcc-logo="{$logoAttr}"
     data-dcc-bootstrap="{$seedAttr}"></div>
HTML;
}

/* ── HTML mutation (idempotent) ────────────────────────────────────────── */

/**
 * Inject or replace the DCC bootstrap script in <head>. Idempotent.
 */
function inject_or_replace_bootstrap(string $html): string
{
    $script = build_bootstrap_script();
    // If bootstrap already exists, replace the entire <script>…</script> block.
    if (has_dcc_bootstrap($html)) {
        $next = preg_replace(
            '#<script>\s*/\* DCC Header bootstrap.*?</script>#s',
            $script,
            $html,
            1
        );
        return is_string($next) ? $next : $html;
    }
    // Preferred anchor: AFTER the first <title>…</title>
    if (preg_match('#</title>#i', $html)) {
        $next = preg_replace('#(</title>)#i', '$1' . "\n" . $script, $html, 1);
        if (is_string($next)) return $next;
    }
    // Fallback 1: AFTER the first <meta charset…> (always present)
    if (preg_match('#<meta[^>]+charset=[^>]+>#i', $html)) {
        $next = preg_replace('#(<meta[^>]+charset=[^>]+>)#i', '$1' . "\n" . $script, $html, 1);
        if (is_string($next)) return $next;
    }
    // Fallback 2: AFTER <head> opening
    if (preg_match('#<head[^>]*>#i', $html)) {
        $next = preg_replace('#(<head[^>]*>)#i', '$1' . "\n" . $script, $html, 1);
        if (is_string($next)) return $next;
    }
    return $html;
}

/**
 * Inject or replace the DCC placeholder in the body. Idempotent.
 *
 * Strategy:
 *  1. If a `<div class="dcc-header">…</div>` exists, replace it.
 *  2. Else if a legacy `<div class="form-header">…</div>` exists, replace it.
 *  3. Else insert at the START of `<div class="page-body">` (before doc-content).
 *  4. Else insert at the START of `<body>`.
 */
function inject_or_replace_placeholder(string $html, string $placeholder): string
{
    // Case 1: replace existing dcc-header (single self-closing div + comment)
    if (has_dcc_placeholder($html)) {
        // Replace the optional preceding comment + the dcc-header div
        $next = preg_replace(
            '#(?:' . preg_quote(DCC_PLACEHOLDER_COMMENT, '#') . '\s*)?<div[^>]*class=["\'][^"\']*\bdcc-header\b[^"\']*["\'][^>]*></div>#i',
            $placeholder,
            $html,
            1
        );
        return is_string($next) ? $next : $html;
    }
    // Case 2: replace legacy form-header
    if (has_legacy_form_header($html)) {
        $next = preg_replace(
            '#<div[^>]*class=["\'][^"\']*\bform-header\b[^"\']*["\'][^>]*>.*?</div>\s*</div>#is',  // form-header > inner > /form-header (greedy enough)
            $placeholder,
            $html,
            1
        );
        if (is_string($next) && $next !== $html) return $next;
        // Fallback: try simpler closing
        $next = preg_replace(
            '#<div[^>]*class=["\'][^"\']*\bform-header\b[^"\']*["\'][^>]*>.*?</div>#is',
            $placeholder,
            $html,
            1
        );
        if (is_string($next)) return $next;
    }
    // Case 3: insert at start of page-body
    $next = preg_replace(
        '#(<div[^>]*class=["\'][^"\']*\bpage-body\b[^"\']*["\'][^>]*>)#i',
        '$1' . "\n" . $placeholder,
        $html,
        1
    );
    if (is_string($next) && $next !== $html) return $next;
    // Case 4: insert at start of body
    $next = preg_replace(
        '#(<body[^>]*>)#i',
        '$1' . "\n" . $placeholder,
        $html,
        1
    );
    return is_string($next) ? $next : $html;
}

/**
 * Strip stray ISO-section title/subtitle that the legacy form-header left
 * behind. Specifically, when an `<div class="iso-map">` opens directly with
 * `<div class="title"><strong class="doc-name">…`, replace that title block
 * with `<div class="iso-title">Chuẩn mực áp dụng / nguyên tắc bắt buộc</div>`.
 */
function clean_iso_title_concat(string $html): string
{
    $next = preg_replace(
        '#(<div[^>]*class=["\'][^"\']*\biso-map\b[^"\']*["\'][^>]*>)\s*<div[^>]*class=["\'][^"\']*\btitle\b[^"\']*["\'][^>]*>\s*<strong[^>]*class=["\'][^"\']*\bdoc-name\b[^"\']*["\'][^>]*>.*?</strong>(?:\s*<span[^>]*class=["\'][^"\']*\bsub-vn\b[^"\']*["\'][^>]*>.*?</span>)?(?:\s*<span[^>]*class=["\'][^"\']*\bmuted\b[^"\']*["\'][^>]*>.*?</span>)?\s*</div>#isu',
        '$1<div class="iso-title">Chuẩn mực áp dụng / nguyên tắc bắt buộc</div>',
        $html,
        1
    );
    return is_string($next) ? $next : $html;
}

/**
 * Strip the legacy "flattened" title + meta blocks that sit between the DCC
 * placeholder and the real document content. Many SOPs use this layout
 * (no `<div class="form-header">` wrapper):
 *
 *   <div class="page-body">
 *     <div class="dcc-header" ...></div>      ← inserted by us
 *     <div class="title">…doc-name + sub-vn…</div>   ← legacy, must drop
 *     <div class="meta">…rows…</div>                  ← legacy, must drop
 *     <div class="doc-content">…real content…</div>   ← keep
 *   </div>
 *
 * Removal is bounded by the dcc-header anchor at the top so we never touch
 * `<div class="title">` blocks deeper in the body (e.g. cards inside content).
 *
 * Implementation walks the string with a balanced-div counter so it handles
 * arbitrary nesting inside `.meta` (which contains `<div class="row">` rows).
 */
function strip_legacy_title_meta_after_placeholder(string $html): string
{
    if (!has_dcc_placeholder($html)) {
        return $html;
    }
    if (!preg_match('#<div[^>]*class=["\'][^"\']*\bdcc-header\b[^"\']*["\'][^>]*></div>#i', $html, $m, PREG_OFFSET_CAPTURE)) {
        return $html;
    }
    $cursor = (int)($m[0][1] + strlen($m[0][0]));

    while (true) {
        // Skip whitespace
        $ws = 0;
        while ($cursor + $ws < strlen($html) && ctype_space($html[$cursor + $ws])) {
            $ws++;
        }
        $look = substr($html, $cursor + $ws, 200);
        if (!preg_match('#^<div[^>]*class=["\'][^"\']*\b(title|meta)\b[^"\']*["\'][^>]*>#i', $look, $hm)) {
            break;
        }
        $blockStart = $cursor + $ws;
        $openLen    = strlen($hm[0]);
        $depth      = 1;
        $scan       = $blockStart + $openLen;
        $end        = strlen($html);
        $consumed   = false;

        while ($scan < $end && $depth > 0) {
            $nextOpen  = stripos($html, '<div', $scan);
            $nextClose = stripos($html, '</div', $scan);
            if ($nextClose === false) break;
            if ($nextOpen !== false && $nextOpen < $nextClose) {
                $boundary = $html[$nextOpen + 4] ?? '';
                if ($boundary === ' ' || $boundary === '>' || $boundary === "\t" || $boundary === "\n" || $boundary === "\r") {
                    $depth++;
                }
                $scan = $nextOpen + 4;
            } else {
                $depth--;
                $closeEnd = strpos($html, '>', $nextClose);
                if ($closeEnd === false) break;
                $scan = $closeEnd + 1;
                if ($depth === 0) {
                    $html     = substr($html, 0, $blockStart) . substr($html, $scan);
                    $cursor   = $blockStart;
                    $consumed = true;
                    break;
                }
            }
        }
        if (!$consumed) break;  // unbalanced — bail out for safety
    }
    return $html;
}

/* ── DataLayer bootstrapping (PostgreSQL via the production stack) ─────── */

/**
 * Build a DataLayer instance using the same fallback config as
 * `mom/api/index.php`. Returns null if the connection cannot be opened.
 */
function build_data_layer(string $rootDir): ?\MOM\Database\DataLayer
{
    $dataDir = $rootDir . '/mom/data';
    require_once $rootDir . '/mom/database/Connection.php';
    require_once $rootDir . '/mom/database/RuntimeShadowSync.php';
    require_once $rootDir . '/mom/database/DataLayer.php';

    // The default config.php returns use_postgres=false in CLI context (no
    // env vars set). Force a working POSTGRES_ONLY config here so the batch
    // tool can read/write dcc_document_header. Honour env DB_PASS / DB_USER
    // / DB_HOST / DB_NAME so the same script runs on dev + VPS unchanged.
    $config = [
        'use_postgres'         => true,
        'shadow_write'         => false,
        'json_fallback'        => false,
        'allow_empty_password' => true,
        'driver'               => 'pgsql',
        'host'                 => getenv('DB_HOST') ?: 'localhost',
        'port'                 => (int)(getenv('DB_PORT') ?: 5432),
        'database'             => getenv('DB_NAME') ?: 'mom',
        'username'             => getenv('DB_USER') ?: 'mom_app',
        'password'             => getenv('DB_PASS') ?: '',
        'charset'              => 'utf8',
        'schema'               => 'public',
        'sslmode'              => 'prefer',
    ];
    try {
        $dl = new \MOM\Database\DataLayer($dataDir, $rootDir, $config);
        // Smoke-test the connection so we surface DSN errors here rather than
        // deep inside the audit loop.
        $dl->query("SELECT 1 AS ok");
        return $dl;
    } catch (\Throwable $e) {
        fwrite(STDERR, "[dcc-batch] Cannot open DataLayer: " . $e->getMessage() . "\n");
        fwrite(STDERR, "[dcc-batch] Pass DB_PASS via env, e.g.: DB_PASS=… php …/audit.php\n");
        return null;
    }
}
