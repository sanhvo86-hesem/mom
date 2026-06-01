#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Module Build Packet (L5 manifest) Gate — Lego-SSOT enforcement by machine.
 * ════════════════════════════════════════════════════════════════════════════
 * A module ships as a build packet that references an archetype + theme preset
 * and assembles PUBLISHED L3 blocks into zones — carrying ZERO style. This gate
 * rejects manifests that smuggle visual literals or unpublished blocks:
 *
 *   CHECK 1 — JSON well-formed.
 *   CHECK 2 — required manifest fields present (moduleId, moduleArchetype, zones).
 *   CHECK 3 — ZERO style: no hex color literal, no `<n>px` literal, no inline
 *             "style" key, no raw HTML tag in a string, no numeric/px `density`
 *             override. Visual identity belongs to the Theme/token authority.
 *   CHECK 4 — every DOTTED block reference (block_key form a.b) resolves to a
 *             PUBLISHED block in the L3 registry. (block-instance ids like
 *             `blk-…` are packet-local and validated by the runtime assembler,
 *             not here — reported as advisory unverified.)
 *   CHECK 5 — advisory: a newly authored packet should declare an a11yProfile
 *             and a previewScene (warn only — never blocks).
 *
 * GRANDFATHER ALLOWLIST: the current tree still predates these rules. Files in
 * $GRANDFATHER are scanned and their findings PRINTED, but downgraded to
 * advisory (the gate stays green). Any NEW or de-listed packet is held to the
 * full P0 bar. Shrink the allowlist as packets are migrated — the gate tightens
 * automatically.
 *
 * Exit: 0 = clean (or only-advisory), 1 = P0 blocking finding, 2 = setup error.
 */

$root = dirname(__DIR__, 3);
$packetDir = $root . '/mom/design/build-packets';
$registryFp = $root . '/mom/scripts/portal/00bc-block-registry.js';

// Build packets currently predating the L5 manifest rules. Relative to repo root.
$GRANDFATHER = [
    'mom/design/build-packets/M2-orders.json',
    'mom/design/build-packets/M4-purchasing.json',
];

if (!is_dir($packetDir)) {
    // No manifests yet — nothing to gate.
    fwrite(STDOUT, "module manifest gate: no build-packets directory, nothing to check\n");
    exit(0);
}

// ── Published L3 block_key set (from the runtime registry JS) ────────────────
$published = [];
if (is_file($registryFp)) {
    $raw = (string)file_get_contents($registryFp);
    $start = strpos($raw, '=');
    $objStart = $start !== false ? strpos($raw, '{', $start) : false;
    $objEnd = strrpos($raw, '}');
    if ($objStart !== false && $objEnd !== false && $objEnd > $objStart) {
        $json = json_decode(substr($raw, $objStart, $objEnd - $objStart + 1), true);
        if (is_array($json) && isset($json['blocks']) && is_array($json['blocks'])) {
            foreach ($json['blocks'] as $b) {
                $key = is_array($b) ? (string)($b['block_key'] ?? '') : '';
                $status = is_array($b) ? (string)($b['status'] ?? 'published') : 'published';
                if ($key !== '' && $status === 'published') {
                    $published[$key] = true;
                }
            }
        }
    }
}

$files = glob($packetDir . '/*.json') ?: [];
$p0Total = 0;
$advisoryTotal = 0;

foreach ($files as $file) {
    $rel = ltrim(str_replace($root, '', $file), '/');
    $grandfathered = in_array($rel, $GRANDFATHER, true);
    $findings = []; // [level => 'P0'|'ADVISORY', msg]

    $rawJson = (string)file_get_contents($file);
    $doc = json_decode($rawJson, true);

    // CHECK 1 — well-formed
    if (!is_array($doc)) {
        $findings[] = ['P0', 'invalid JSON: ' . json_last_error_msg()];
        emitFile($rel, $grandfathered, $findings, $p0Total, $advisoryTotal);
        continue;
    }

    // CHECK 2 — required fields
    foreach (['moduleId', 'moduleArchetype', 'zones'] as $req) {
        if (!isset($doc[$req]) || $doc[$req] === '' || $doc[$req] === []) {
            $findings[] = ['P0', "missing required manifest field: {$req}"];
        }
    }
    if (isset($doc['zones']) && !is_array($doc['zones'])) {
        $findings[] = ['P0', 'zones must be an object (zone -> block list)'];
    }

    // CHECK 3 — zero style (scan the serialized manifest)
    if (preg_match_all('/#[0-9a-fA-F]{6}\b/', $rawJson, $hx) && count($hx[0]) > 0) {
        $findings[] = ['P0', 'hex color literal in manifest (' . implode(', ', array_slice(array_unique($hx[0]), 0, 5)) . ') — colors belong to the theme/token authority'];
    }
    if (preg_match_all('/\b\d+(?:\.\d+)?px\b/', $rawJson, $px) && count($px[0]) > 0) {
        $findings[] = ['P0', 'px literal in manifest (' . implode(', ', array_slice(array_unique($px[0]), 0, 5)) . ') — sizing belongs to the theme/token authority'];
    }
    if (preg_match('/"style"\s*:/', $rawJson)) {
        $findings[] = ['P0', 'inline "style" key in manifest — no inline style allowed'];
    }
    if (preg_match('/"<[a-zA-Z\/!]/', $rawJson)) {
        $findings[] = ['P0', 'raw HTML tag in a manifest string — blocks render via the assembler, not hand-written HTML'];
    }
    // density OVERRIDE: a "density" key with a numeric or px value (not a
    // densityModes enum array, which is a legitimate allow-list).
    if (preg_match('/"density"\s*:\s*"?\d+(?:px)?"?/', $rawJson)) {
        $findings[] = ['P0', 'density override in manifest — density is a single Theme-owned knob, not a per-module literal'];
    }

    // CHECK 4 — dotted block_key references resolve to a published block.
    $refs = collectBlockRefs($doc);
    foreach ($refs as $ref) {
        if (preg_match('/^[a-z][a-z0-9]*\.[a-z][a-z0-9.]*$/', $ref)) {
            if ($published !== [] && !isset($published[$ref])) {
                $findings[] = ['P0', "references unpublished block_key '{$ref}'"];
            }
        }
        // non-dotted (blk-… instance ids) are packet-local; not gated here.
    }
    if ($published === []) {
        $findings[] = ['ADVISORY', 'could not load published block registry (00bc-block-registry.js) — block_key publish check skipped'];
    }

    // CHECK 5 — advisory completeness
    if (!isset($doc['a11yProfile'])) {
        $findings[] = ['ADVISORY', 'no a11yProfile declared (required for newly authored packets)'];
    }
    if (!isset($doc['previewScene']) && !isset($doc['screens'])) {
        $findings[] = ['ADVISORY', 'no previewScene declared (simulate-before-submit evidence)'];
    }

    emitFile($rel, $grandfathered, $findings, $p0Total, $advisoryTotal);
}

fwrite(STDOUT, sprintf(
    "\nmodule manifest gate: %d packet(s) scanned, %d blocking, %d advisory, %d grandfathered file(s)\n",
    count($files), $p0Total, $advisoryTotal, count($GRANDFATHER)
));

exit($p0Total > 0 ? 1 : 0);

/**
 * Recursively collect block references from zones + nested placements.
 * @param array<string, mixed> $doc
 * @return array<int, string>
 */
function collectBlockRefs(array $doc): array
{
    $refs = [];
    $zones = $doc['zones'] ?? [];
    if (is_array($zones)) {
        foreach ($zones as $list) {
            if (!is_array($list)) {
                continue;
            }
            foreach ($list as $item) {
                if (is_string($item)) {
                    $refs[] = $item;
                } elseif (is_array($item) && isset($item['block']) && is_string($item['block'])) {
                    $refs[] = $item['block'];
                }
            }
        }
    }
    return array_values(array_unique($refs));
}

/**
 * @param array<int, array{0:string,1:string}> $findings
 */
function emitFile(string $rel, bool $grandfathered, array $findings, int &$p0Total, int &$advisoryTotal): void
{
    if ($findings === []) {
        fwrite(STDOUT, "  [ OK ] {$rel}\n");
        return;
    }
    $tag = $grandfathered ? '[GRANDFATHERED]' : '';
    fwrite(STDOUT, "  [FAIL] {$rel} {$tag}\n");
    foreach ($findings as [$level, $msg]) {
        // Grandfathered files: every finding is advisory (gate stays green).
        $effective = ($grandfathered && $level === 'P0') ? 'ADVISORY(grandfathered)' : $level;
        fwrite(STDOUT, "         - [{$effective}] {$msg}\n");
        if ($effective === 'P0') {
            $p0Total++;
        } else {
            $advisoryTotal++;
        }
    }
}
