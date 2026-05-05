<?php
/**
 * audit-runtime-files.php
 *
 * Walks the codebase and finds every PHP write whose path resolves under
 * mom/data/config/. Cross-references that set against the canonical preserve
 * list in tools/vps-setup/scripts/_runtime-files.sh. If anything is missing
 * from the list, exit 1 — the next deploy will silently clobber that file.
 *
 * Run locally:
 *   php tools/vps-setup/scripts/audit-runtime-files.php
 *
 * Wire into CI to fail PRs that introduce new save_*() calls without
 * registering the file in _runtime-files.sh.
 *
 * Detection patterns (kept conservative — false positives are easier to
 * dismiss than false negatives):
 *   1. write_json_file($X, ...) where $X is a string ending in config/<file>.json
 *   2. file_put_contents($X, ...) similarly
 *   3. $this->data->saveConfig('<key>', ...)  → confDir/<key>.json
 *   4. Direct assignment patterns:  $FOO_FILE = $CONF_DIR . '/<file>.json'
 *      followed by users_save / save_xxx referring to that variable.
 */

declare(strict_types=1);

$repoRoot = realpath(__DIR__ . '/../../..');
if ($repoRoot === false) {
    fwrite(STDERR, "audit: cannot resolve repo root\n");
    exit(2);
}

// ── Load canonical list ──────────────────────────────────────────────────
$listPath = $repoRoot . '/tools/vps-setup/scripts/_runtime-files.sh';
if (!is_file($listPath)) {
    fwrite(STDERR, "audit: $listPath not found\n");
    exit(2);
}
$listSrc = (string)file_get_contents($listPath);
$canonical = [];
// Strip shell comments first, THEN match the array body. The naive
// /\(...\)/ would otherwise stop at the first ) inside an inline comment
// like "# users_save() — login".
$listNoComments = preg_replace('/#[^\n]*/', '', $listSrc);
if (preg_match('/RUNTIME_CONFIG_FILES=\(([^)]*)\)/s', (string)$listNoComments, $m)) {
    foreach (preg_split('/\s+/', $m[1]) as $tok) {
        $tok = trim($tok);
        if ($tok !== '' && str_ends_with($tok, '.json')) {
            $canonical[$tok] = true;
        }
    }
}
if (empty($canonical)) {
    fwrite(STDERR, "audit: could not parse RUNTIME_CONFIG_FILES from $listPath\n");
    exit(2);
}

// ── Scan PHP sources ─────────────────────────────────────────────────────
$scanDirs = [
    $repoRoot . '/mom/api',
    $repoRoot . '/mom/database',
];
$apiPhp = $repoRoot . '/mom/api.php';

$phpFiles = [];
foreach ($scanDirs as $dir) {
    if (!is_dir($dir)) {
        continue;
    }
    $it = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS));
    foreach ($it as $f) {
        if ($f->isFile() && str_ends_with((string)$f, '.php')) {
            $phpFiles[] = (string)$f;
        }
    }
}
if (is_file($apiPhp)) {
    $phpFiles[] = $apiPhp;
}

$discovered = []; // basename => list<callsite>

foreach ($phpFiles as $file) {
    $rel = substr($file, strlen($repoRoot) + 1);
    $src = (string)file_get_contents($file);
    if ($src === '') {
        continue;
    }

    // 1) Inline path patterns:
    //    'config/<basename>.json'
    //    "config/<basename>.json"
    if (preg_match_all("#['\"]config/([a-z0-9_.-]+\\.json)['\"]#i", $src, $m, PREG_OFFSET_CAPTURE)) {
        foreach ($m[1] as $hit) {
            $bn = $hit[0];
            // Look at ±150 chars of context to gate on writer-y verbs so we
            // don't flag every read as a write. False negatives are caught
            // by the saveConfig() and $X_FILE patterns below.
            $offset = max(0, ((int)$hit[1]) - 150);
            $window = substr($src, $offset, 300);
            if (preg_match('/(write_json_file|file_put_contents|saveConfig|save_|users_save|->writeJson|atomic_write_json)/', $window)) {
                $discovered[$bn][] = $rel;
            }
        }
    }

    // 2) saveConfig('<key>', ...) — DataLayer expands to config/<key>.json
    if (preg_match_all("/saveConfig\\(\\s*['\"]([a-z0-9_]+)['\"]/i", $src, $m)) {
        foreach ($m[1] as $key) {
            $discovered[$key . '.json'][] = $rel . ' (saveConfig)';
        }
    }

    // 3) $X_FILE = $CONF_DIR . '/<file>.json' followed by writes elsewhere.
    if (preg_match_all('/\\$([A-Z_]+_FILE)\\s*=\\s*\\$(?:CONF_DIR|confDir|confDir\\(\\))\\s*\\.\\s*[\'"]\\/([a-z0-9_.-]+\\.json)[\'"]/i', $src, $m)) {
        foreach ($m[2] as $i => $bn) {
            $varName = $m[1][$i];
            // Only count if there's a corresponding write of that variable somewhere.
            if (preg_match('/(write_json_file|users_save|save_[a-z_]+|file_put_contents|atomic_write_json)\\s*\\(\\s*\\$' . preg_quote($varName, '/') . '/', $src)) {
                $discovered[$bn][] = $rel . ' ($' . $varName . ')';
            }
        }
    }

    // 4) $this->confDir . '/<file>.json'  with adjacent writer call.
    if (preg_match_all('#confDir\\s*\\.\\s*[\'"]\\/([a-z0-9_.-]+\\.json)[\'"]#i', $src, $m, PREG_OFFSET_CAPTURE)) {
        foreach ($m[1] as $hit) {
            $bn = $hit[0];
            $offset = max(0, ((int)$hit[1]) - 200);
            $window = substr($src, $offset, 400);
            if (preg_match('/(write_json_file|file_put_contents|saveConfig|save_|users_save|->writeJson|atomic_write_json)/', $window)) {
                $discovered[$bn][] = $rel . ' ($confDir)';
            }
        }
    }
}

// ── Compare ──────────────────────────────────────────────────────────────
$missing = [];
foreach (array_keys($discovered) as $bn) {
    if (!isset($canonical[$bn])) {
        $missing[$bn] = array_values(array_unique($discovered[$bn]));
    }
}

$unused = [];
foreach (array_keys($canonical) as $bn) {
    if (!isset($discovered[$bn])) {
        $unused[] = $bn;
    }
}

echo "Runtime-files audit\n";
echo "  Canonical list:  " . count($canonical) . " files (tools/vps-setup/scripts/_runtime-files.sh)\n";
echo "  Discovered:      " . count($discovered) . " files written by PHP under mom/data/config/\n";
echo "  Scanned:         " . count($phpFiles) . " PHP files\n";
echo "\n";

if (!empty($missing)) {
    echo "FAIL: " . count($missing) . " runtime-mutated file(s) NOT in preserve list:\n";
    foreach ($missing as $bn => $sites) {
        echo "  - $bn\n";
        foreach (array_slice($sites, 0, 5) as $s) {
            echo "      written by: $s\n";
        }
        if (count($sites) > 5) {
            echo "      ... and " . (count($sites) - 5) . " more\n";
        }
    }
    echo "\nFix: append the missing basename(s) to RUNTIME_CONFIG_FILES in\n";
    echo "     tools/vps-setup/scripts/_runtime-files.sh\n";
    echo "     and update the matching constant in DataSyncStatusService.php.\n";
    exit(1);
}

if (!empty($unused)) {
    echo "INFO: " . count($unused) . " entries in preserve list with no discovered writer (may be ok):\n";
    foreach ($unused as $bn) {
        echo "  - $bn\n";
    }
    echo "\n";
}

echo "OK: every discovered runtime writer is covered by the preserve list.\n";
exit(0);
