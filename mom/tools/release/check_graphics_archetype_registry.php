#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * L4 Module Archetype Gate (Lego-SSOT, top of the stack)
 * ════════════════════════════════════════════════════════════════════════════
 * An archetype ships only when it is provably assemblable from PUBLISHED L3
 * blocks. Validates mom/scripts/portal/00be-archetype-registry.js against the
 * L3 block registry (00bc) and the renderer (00bf):
 *
 *   CHECK 1 — well-formed; required fields per archetype present.
 *   CHECK 2 — every zone's `block` is a PUBLISHED block in 00bc-block-registry.js
 *             (an archetype cannot place a phantom / draft block).
 *   CHECK 3 — every required_blocks entry is referenced by some zone.
 *   CHECK 4 — every zone in zone_order exists in zones.
 *   CHECK 5 — every PUBLISHED archetype has an ArchetypeKit renderer path
 *             (its key appears in 00bf-archetypekit.js — sanity that the file
 *             knows the archetype; rendering is generic so this is a soft tie).
 *   CHECK 6 — archetype_key uniqueness; route_class non-empty.
 *
 * Exit: 0 = clean, 1 = P0 blocking finding, 2 = setup error.
 */

$root = dirname(__DIR__, 3);
$archFp  = $root . '/mom/scripts/portal/00be-archetype-registry.js';
$blockFp = $root . '/mom/scripts/portal/00bc-block-registry.js';
$kitFp   = $root . '/mom/scripts/portal/00bf-archetypekit.js';

foreach (['archetype' => $archFp, 'block' => $blockFp, 'kit' => $kitFp] as $label => $fp) {
    if (!is_file($fp)) {
        fwrite(STDERR, "ERROR: {$label} registry not found: {$fp}\n");
        exit(2);
    }
}

/** Extract the `window.__X__ = { … };` object literal from a JS SSOT file. */
function extract_literal(string $raw): ?array
{
    $start = strpos($raw, '=');
    $objStart = $start !== false ? strpos($raw, '{', $start) : false;
    $objEnd = strrpos($raw, '}');
    if ($objStart === false || $objEnd === false || $objEnd <= $objStart) {
        return null;
    }
    $decoded = json_decode(substr($raw, $objStart, $objEnd - $objStart + 1), true);
    return is_array($decoded) ? $decoded : null;
}

$arch = extract_literal((string)file_get_contents($archFp));
if (!is_array($arch) || !isset($arch['archetypes']) || !is_array($arch['archetypes'])) {
    fwrite(STDERR, "[P0] archetype registry malformed or missing 'archetypes' array in 00be\n");
    exit(1);
}
$blockReg = extract_literal((string)file_get_contents($blockFp));
if (!is_array($blockReg) || !isset($blockReg['blocks'])) {
    fwrite(STDERR, "[P0] could not read L3 block registry from 00bc\n");
    exit(1);
}

// Set of PUBLISHED block keys.
$publishedBlocks = [];
foreach ($blockReg['blocks'] as $b) {
    if (($b['status'] ?? '') === 'published' && isset($b['block_key'])) {
        $publishedBlocks[$b['block_key']] = true;
    }
}

$kit = (string)file_get_contents($kitFp);
$REQUIRED = ['archetype_key', 'display_name_en', 'display_name_vi', 'route_class', 'status', 'zones'];

$findings = [];
$seen = [];
$published = 0;

foreach ($arch['archetypes'] as $idx => $a) {
    $tag = is_array($a) && isset($a['archetype_key']) ? (string)$a['archetype_key'] : "archetype#{$idx}";

    foreach ($REQUIRED as $f) {
        if (!array_key_exists($f, $a)) {
            $findings[] = "[P0] {$tag}: missing required field '{$f}'";
        }
    }
    if (!isset($a['archetype_key'])) {
        continue;
    }

    // CHECK 6 — uniqueness + route_class
    if (isset($seen[$a['archetype_key']])) {
        $findings[] = "[P0] duplicate archetype_key '{$a['archetype_key']}'";
    }
    $seen[$a['archetype_key']] = true;
    if (empty($a['route_class'])) {
        $findings[] = "[P0] {$tag}: empty route_class";
    }

    $zones = isset($a['zones']) && is_array($a['zones']) ? $a['zones'] : [];

    // CHECK 2 — each zone's block is a published L3 block
    foreach ($zones as $zname => $zdef) {
        $bk = is_array($zdef) ? ($zdef['block'] ?? null) : null;
        if ($bk === null) {
            $findings[] = "[P0] {$tag}: zone '{$zname}' has no block";
            continue;
        }
        if (empty($publishedBlocks[$bk])) {
            $findings[] = "[P0] {$tag}: zone '{$zname}' references block '{$bk}' which is not a PUBLISHED L3 block";
        }
    }

    // CHECK 3 — required_blocks all referenced by a zone
    $zoneBlocks = [];
    foreach ($zones as $zdef) {
        if (is_array($zdef) && isset($zdef['block'])) {
            $zoneBlocks[$zdef['block']] = true;
        }
    }
    foreach (($a['required_blocks'] ?? []) as $rb) {
        if (empty($zoneBlocks[$rb])) {
            $findings[] = "[P0] {$tag}: required_block '{$rb}' is not used by any zone";
        }
    }

    // CHECK 4 — zone_order entries exist
    foreach (($a['zone_order'] ?? []) as $zo) {
        if (!array_key_exists($zo, $zones)) {
            $findings[] = "[P0] {$tag}: zone_order entry '{$zo}' is not a defined zone";
        }
    }

    // CHECK 5 — renderer knows the archetype (soft tie: key appears in 00bf)
    if (($a['status'] ?? '') === 'published') {
        $published++;
        if (strpos($kit, $a['archetype_key']) === false
            && strpos($kit, 'ArchetypeKit') === false) {
            $findings[] = "[P0] {$tag}: published but 00bf-archetypekit.js has no ArchetypeKit renderer";
        }
    }
}

fwrite(STDOUT, "L4 archetype registry gate\n");
fwrite(STDOUT, '  archetypes: ' . count($arch['archetypes']) . " (published: {$published})\n");
fwrite(STDOUT, '  published L3 blocks available: ' . count($publishedBlocks) . "\n");

if ($findings === []) {
    fwrite(STDOUT, "archetype registry clean\n");
    exit(0);
}
foreach ($findings as $f) {
    fwrite(STDERR, $f . "\n");
}
fwrite(STDERR, 'archetype registry blocking violations: ' . count($findings) . "\n");
exit(1);
