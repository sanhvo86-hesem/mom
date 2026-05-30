#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Graphics SSOT Gate — "Lego, no-hardcode" enforcement (P1)
 * ════════════════════════════════════════════════════════════════════════════
 * Three checks, one script (mirrors check_repo_boundary.php's posture):
 *
 *   GATE 1 — No-hardcode (governed set): JS files in the GOVERNED_GLOBS set
 *            must contain ZERO colour literals (hex `#rgb`/`#rrggbb`, rgb()/
 *            rgba(), hsl()) and ZERO `style="...background|color..."` colour
 *            literals. New Lego-module code lives here. Legacy portal JS is NOT
 *            in the set (1951 pre-existing literals are grandfathered until the
 *            owning module migrates onto tokens; add a file to GOVERNED_GLOBS
 *            the moment it is cleaned).
 *
 *   GATE 2 — Dark-mode parity: every selector in SURFACE_SELECTORS that sets a
 *            background in a non-dark rule of a scanned module CSS must also be
 *            covered by a dark-mode rule (matching [data-color-mode="dark"] OR
 *            [data-color-scheme-active="dark"]). This is the exact class of bug
 *            that left the sidebar / admin rail / inputs white in dark mode.
 *
 *   GATE 3 — White-literal-in-color-mix: flags `rgba(255,255,255,...)` used as
 *            a surface base inside a scanned module CSS that has no dark
 *            override for the same selector — the literal that bypassed the
 *            token system in .nav-section / .admin-nav-group.
 *
 * Exit: 0 = clean (or warnings only), 1 = P0 blocking finding, 2 = setup error.
 * Calibrated to PASS on the current tree; tighten by widening GOVERNED_GLOBS.
 */

$root = dirname(__DIR__, 3);

/* ── GATE 1 config ──────────────────────────────────────────────────────────
 * Files/globs that MUST be hardcode-free. Start with the already-clean v3 set
 * (orders-v3) + the Theme tab. Widen as modules migrate onto tokens. */
$GOVERNED_GLOBS = [
    'mom/scripts/portal/09v3-*.js',
];
/* The Graphics Authority engine (00bb) and PreviewScenes legitimately carry
 * fallback defaults `tokens.read(key, '#hex')` and demo-scene swatches; it is
 * the authority, not a consuming module, so it is intentionally NOT governed
 * here. Consuming modules (09v3-*, future Lego modules) must stay literal-free. */

/* ── GATE 2/3 config ────────────────────────────────────────────────────────
 * Module stylesheets whose surface selectors must have dark-mode parity. */
$SCANNED_CSS = [
    'mom/styles/orders-v3.css',
];
/* Surfaces that MUST flip in dark mode if they set a light background. */
$SURFACE_SELECTORS = [
    '#sidebar', '.nav-section', '.admin-nav-panel', '.admin-nav-group',
];

$findings = [];   // each: [severity, gate, message]

/* ── helpers ──────────────────────────────────────────────────────────────── */
$expand = static function (string $glob) use ($root): array {
    return glob($root . '/' . $glob) ?: [];
};
$rel = static function (string $abs) use ($root): string {
    return ltrim(str_replace($root, '', $abs), '/');
};

/* ════════════════════════════════════════════════════════════════════════════
 * GATE 1 — No-hardcode in governed JS
 * ════════════════════════════════════════════════════════════════════════════ */
$g1files = [];
foreach ($GOVERNED_GLOBS as $glob) {
    foreach ($expand($glob) as $f) {
        $g1files[$f] = true;
    }
}
foreach (array_keys($g1files) as $file) {
    $src = (string)file_get_contents($file);
    $lines = explode("\n", $src);
    foreach ($lines as $i => $line) {
        // strip // line comments to avoid flagging documented examples
        $code = preg_replace('#//.*$#', '', $line);
        $hits = [];
        // quoted hex colour literal
        if (preg_match('/[\'"]#[0-9a-fA-F]{3,8}[\'"]/', (string)$code)) {
            $hits[] = 'hex colour literal';
        }
        // rgb()/rgba()/hsl() literal
        if (preg_match('/\b(rgba?|hsla?|hsl)\s*\(\s*\d/', (string)$code)) {
            $hits[] = 'rgb/hsl colour literal';
        }
        // inline style with a colour literal (background:#.. / color:rgb..)
        if (preg_match('/style\s*=.*(background|color)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\()/', (string)$code)) {
            $hits[] = 'inline style colour literal';
        }
        foreach ($hits as $h) {
            $findings[] = ['P0', 'no-hardcode', $rel($file) . ':' . ($i + 1) . ' — ' . $h];
        }
    }
}

/* ════════════════════════════════════════════════════════════════════════════
 * GATE 2 + 3 — Dark-mode parity for surface selectors
 * ════════════════════════════════════════════════════════════════════════════ */
foreach ($SCANNED_CSS as $glob) {
    foreach ($expand($glob) as $file) {
        $css = (string)file_get_contents($file);
        // crude rule split: "selector { body }"
        preg_match_all('/([^{}]+)\{([^{}]*)\}/s', $css, $rules, PREG_SET_ORDER);

        // collect which surface selectors get a light bg in a non-dark rule,
        // and which have a dark-mode rule at all.
        $lightBg = [];   // selector => true
        $darkCovered = []; // selector => true
        $whiteLiteral = []; // selector => true (gate 3)

        foreach ($rules as $r) {
            $sel = trim($r[1]);
            $body = $r[2];
            $isDark = (strpos($sel, 'data-color-mode="dark"') !== false)
                   || (strpos($sel, 'data-color-scheme-active="dark"') !== false);

            foreach ($SURFACE_SELECTORS as $surf) {
                // match the surface selector as a token in the rule's selector list
                if (!preg_match('/(^|[\s,>])' . preg_quote($surf, '/') . '($|[\s,{:.])/', $sel)) {
                    continue;
                }
                if ($isDark) {
                    $darkCovered[$surf] = true;
                } else {
                    if (preg_match('/background\s*:/', $body)) {
                        $lightBg[$surf] = true;
                    }
                    if (preg_match('/rgba\(\s*255\s*,\s*255\s*,\s*255/', $body)) {
                        $whiteLiteral[$surf] = true;
                    }
                }
            }
        }

        // Dark overrides may live in a DIFFERENT stylesheet (density-darkmode.css).
        // Treat the repo's density-darkmode.css as the global dark layer.
        $darkLayer = (string)@file_get_contents($root . '/mom/styles/density-darkmode.css');
        foreach ($SURFACE_SELECTORS as $surf) {
            if (!empty($darkCovered[$surf])) {
                continue;
            }
            // does the global dark layer cover this surface?
            if (preg_match('/data-color-mode="dark"\][^{]*' . preg_quote($surf, '/') . '/', $darkLayer)
             || preg_match('/data-color-scheme-active="dark"\][^{]*' . preg_quote($surf, '/') . '/', $darkLayer)) {
                $darkCovered[$surf] = true;
            }
        }

        foreach (array_keys($lightBg) as $surf) {
            if (empty($darkCovered[$surf])) {
                $findings[] = ['P0', 'dark-parity',
                    $rel($file) . " — selector '{$surf}' sets a light background but has no dark-mode override (add a [data-color-mode=\"dark\"] rule in density-darkmode.css)"];
            }
        }
        // GATE 3 is UNCONDITIONAL: a hardcoded white surface base is a
        // no-hardcode violation regardless of whether a dark override exists —
        // the override may lose the cascade (exactly what happened with
        // .nav-section / #admin-content input). Bind to a surface token.
        foreach (array_keys($whiteLiteral) as $surf) {
            $findings[] = ['P0', 'white-literal',
                $rel($file) . " — selector '{$surf}' uses rgba(255,255,255,…) as a surface base; bind to a surface token (var(--bg-surface)) instead"];
        }
    }
}

/* ── report ─────────────────────────────────────────────────────────────────── */
$blocking = array_filter($findings, static fn($f) => $f[0] !== 'P2');

fwrite(STDOUT, "Graphics SSOT gate (no-hardcode + dark-parity)\n");
fwrite(STDOUT, '  governed JS files: ' . count($g1files) . "\n");
fwrite(STDOUT, '  scanned CSS globs: ' . count($SCANNED_CSS) . "\n");

if ($findings === []) {
    fwrite(STDOUT, "graphics SSOT clean\n");
    exit(0);
}

foreach ($findings as $f) {
    [$sev, $gate, $msg] = $f;
    $stream = $sev === 'P2' ? STDOUT : STDERR;
    fwrite($stream, "[{$sev}] {$gate} {$msg}\n");
}

if ($blocking !== []) {
    fwrite(STDERR, sprintf("graphics SSOT blocking violations: %d of %d total\n", count($blocking), count($findings)));
    exit(1);
}

fwrite(STDOUT, sprintf("graphics SSOT warnings only: %d P2 findings\n", count($findings)));
exit(0);
