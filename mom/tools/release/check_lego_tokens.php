<?php
/**
 * check_lego_tokens.php — CI gate for the Lego Foundation token pipeline.
 *
 * Prevents the generated artifacts from drifting out of sync with the DTCG
 * source (tokens/lego.tokens.json). Two layers:
 *   1. Node-free source-hash check: sha256(source) must equal the @source-sha256
 *      embedded in lego-foundation.css and $sourceSha256 in the generated JSON.
 *      Catches "edited the source but forgot to regenerate".
 *   2. Best-effort full byte-diff via `node tools/scripts/gen-lego-tokens.mjs
 *      --check` when a node binary is available — catches any hand-edit.
 * Plus structural asserts (every seed present, @layer declared).
 *
 * Exit 0 = pass, 1 = P0 finding (blocks deploy). Mirrors the other release gates.
 */

$root = dirname(__DIR__, 3); // .../mom/tools/release -> repo root
$src  = $root . '/tokens/lego.tokens.json';
$css  = $root . '/mom/styles/lego-foundation.css';
$gen  = $root . '/tokens/lego.tokens.generated.json';
$genScript = $root . '/tools/scripts/gen-lego-tokens.mjs';

$p0 = [];
$info = [];

function readf($p) { return is_file($p) ? file_get_contents($p) : null; }

$srcRaw = readf($src);
$cssRaw = readf($css);
$genRaw = readf($gen);

if ($srcRaw === null) $p0[] = "missing DTCG source: tokens/lego.tokens.json";
if ($cssRaw === null) $p0[] = "missing generated CSS: mom/styles/lego-foundation.css";
if ($genRaw === null) $p0[] = "missing generated JSON: tokens/lego.tokens.generated.json";

if (!$p0) {
    // 1. source-hash sync
    $sha = substr(hash('sha256', $srcRaw), 0, 16);
    if (!preg_match('/@source-sha256\s+([0-9a-f]{16})/', $cssRaw, $m)) {
        $p0[] = "lego-foundation.css missing @source-sha256 header";
    } elseif ($m[1] !== $sha) {
        $p0[] = "lego-foundation.css is stale (source-sha256 {$m[1]} != {$sha}). Run: node tools/scripts/gen-lego-tokens.mjs";
    }
    $genJson = json_decode($genRaw, true);
    if (!is_array($genJson) || ($genJson['$sourceSha256'] ?? null) !== $sha) {
        $p0[] = "tokens/lego.tokens.generated.json is stale. Run: node tools/scripts/gen-lego-tokens.mjs";
    }

    // 2. structural: every seed present as --lego-<name>, @layer declared
    if (strpos($cssRaw, '@layer lego.tokens') === false) {
        $p0[] = "lego-foundation.css missing '@layer lego.tokens' governance declaration";
    }
    $srcJson = json_decode($srcRaw, true);
    $seeds = array_keys($srcJson['color']['seed'] ?? []);
    foreach ($seeds as $name) {
        if ($name[0] === '$') continue;
        if (strpos($cssRaw, "--lego-{$name}:") === false) {
            $p0[] = "seed '{$name}' has no --lego-{$name} in lego-foundation.css (regenerate)";
        }
    }

    // 3. best-effort full byte-diff via node (if available)
    $node = trim((string)@shell_exec('command -v node 2>/dev/null'));
    if ($node !== '' && is_file($genScript)) {
        $out = [];
        $rc = 0;
        @exec('cd ' . escapeshellarg($root) . ' && node ' . escapeshellarg('tools/scripts/gen-lego-tokens.mjs') . ' --check 2>&1', $out, $rc);
        if ($rc !== 0) {
            $p0[] = "node --check drift:\n    " . implode("\n    ", $out);
        } else {
            $info[] = "node --check: in sync";
        }
    } else {
        $info[] = "node unavailable — relied on source-hash + structural checks";
    }
}

if ($p0) {
    fwrite(STDERR, "[check_lego_tokens] FAIL (P0):\n");
    foreach ($p0 as $f) fwrite(STDERR, "  - {$f}\n");
    exit(1);
}
echo "[check_lego_tokens] PASS";
foreach ($info as $i) echo " — {$i}";
echo "\n";
exit(0);
