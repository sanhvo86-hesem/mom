#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * L3 Block Registry Gate (Lego-SSOT)
 * ════════════════════════════════════════════════════════════════════════════
 * A block ships only when it is provably assemblable. This gate validates
 * mom/data/config/graphics-block-registry.json against the real CSS + JS:
 *
 *   CHECK 1 — JSON well-formed; required fields per block present.
 *   CHECK 2 — every class in `composed_of` exists as a `.o3-…` selector in
 *             orders-v3.css (a block cannot compose a phantom component).
 *   CHECK 3 — `root_class` is one of `composed_of`.
 *   CHECK 4 — every PUBLISHED block has a renderer in 00bd-blockkit.js
 *             (RENDERERS['block_key']).
 *   CHECK 5 — block_key uniqueness; category ∈ known set.
 *
 * (Token existence is governed by the existing graphics token authority; this
 * gate intentionally does not re-validate token_key spelling to stay decoupled.)
 *
 * Exit: 0 = clean, 1 = P0 blocking finding, 2 = setup error.
 */

$root = dirname(__DIR__, 3);
$registryFp = $root . '/mom/data/config/graphics-block-registry.json';
$cssFp      = $root . '/mom/styles/orders-v3.css';
$blockkitFp = $root . '/mom/scripts/portal/00bd-blockkit.js';

foreach (['registry' => $registryFp, 'css' => $cssFp, 'blockkit' => $blockkitFp] as $label => $fp) {
    if (!is_file($fp)) {
        fwrite(STDERR, "ERROR: {$label} not found: {$fp}\n");
        exit(2);
    }
}

$json = json_decode((string)file_get_contents($registryFp), true);
if (!is_array($json) || !isset($json['blocks']) || !is_array($json['blocks'])) {
    fwrite(STDERR, "[P0] registry JSON malformed or missing 'blocks' array\n");
    exit(1);
}

$css = (string)file_get_contents($cssFp);
$blockkit = (string)file_get_contents($blockkitFp);

// Build the set of .o3-… classes defined in orders-v3.css.
preg_match_all('/\.(o3-[a-z0-9_-]+)/', $css, $m);
$cssClasses = array_flip(array_unique($m[1]));

$KNOWN_CATEGORIES = ['layout', 'display', 'feedback', 'navigation', 'input'];
$REQUIRED_FIELDS = ['block_key', 'display_name_en', 'display_name_vi', 'category', 'status', 'composed_of', 'root_class', 'slots'];

$findings = [];
$seenKeys = [];
$published = 0;

foreach ($json['blocks'] as $idx => $b) {
    $tag = is_array($b) && isset($b['block_key']) ? (string)$b['block_key'] : "block#{$idx}";

    // CHECK 1 — required fields
    foreach ($REQUIRED_FIELDS as $f) {
        if (!array_key_exists($f, $b)) {
            $findings[] = "[P0] {$tag}: missing required field '{$f}'";
        }
    }
    if (!isset($b['block_key'])) {
        continue;
    }

    // CHECK 5 — uniqueness + category
    if (isset($seenKeys[$b['block_key']])) {
        $findings[] = "[P0] duplicate block_key '{$b['block_key']}'";
    }
    $seenKeys[$b['block_key']] = true;
    if (isset($b['category']) && !in_array($b['category'], $KNOWN_CATEGORIES, true)) {
        $findings[] = "[P0] {$tag}: unknown category '{$b['category']}' (allowed: " . implode('|', $KNOWN_CATEGORIES) . ')';
    }

    $composed = isset($b['composed_of']) && is_array($b['composed_of']) ? $b['composed_of'] : [];

    // CHECK 2 — composed_of classes exist in CSS
    foreach ($composed as $cls) {
        if (!isset($cssClasses[$cls])) {
            $findings[] = "[P0] {$tag}: composed_of class '.{$cls}' not found in orders-v3.css (phantom component)";
        }
    }

    // CHECK 3 — root_class ∈ composed_of
    if (isset($b['root_class']) && !in_array($b['root_class'], $composed, true)) {
        $findings[] = "[P0] {$tag}: root_class '{$b['root_class']}' is not in composed_of";
    }

    // CHECK 4 — published blocks have a renderer
    $isPublished = (($b['status'] ?? '') === 'published');
    if ($isPublished) {
        $published++;
        // look for RENDERERS['block_key'] or "'block_key':" in the renderer map
        $needle1 = "'" . $b['block_key'] . "'";
        $needle2 = '"' . $b['block_key'] . '"';
        if (strpos($blockkit, $needle1) === false && strpos($blockkit, $needle2) === false) {
            $findings[] = "[P0] {$tag}: status=published but no renderer for it in 00bd-blockkit.js";
        }
    }
}

fwrite(STDOUT, "L3 block registry gate\n");
fwrite(STDOUT, '  blocks: ' . count($json['blocks']) . " (published: {$published})\n");
fwrite(STDOUT, '  css classes indexed: ' . count($cssClasses) . "\n");

if ($findings === []) {
    fwrite(STDOUT, "block registry clean\n");
    exit(0);
}
foreach ($findings as $f) {
    fwrite(STDERR, $f . "\n");
}
fwrite(STDERR, 'block registry blocking violations: ' . count($findings) . "\n");
exit(1);
