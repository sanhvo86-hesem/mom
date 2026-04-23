<?php
require __DIR__ . '/lib.php';
use MOM\Tools\DccBatch as L;

$path = $argv[1] ?? '';
if (!$path || !is_file($path)) { fwrite(STDERR, "Usage: $argv[0] <path>\n"); exit(1); }
$html = file_get_contents($path);
echo "has_dcc_placeholder: " . (L\has_dcc_placeholder($html) ? "YES" : "NO") . "\n";

$re = '#<div[^>]*class=["\'][^"\']*\bdcc-header\b[^"\']*["\'][^>]*></div>#i';
if (preg_match($re, $html, $m, PREG_OFFSET_CAPTURE)) {
    $cursor = $m[0][1] + strlen($m[0][0]);
    echo "placeholder END at offset $cursor\n";
    $next = substr($html, $cursor, 300);
    echo "next 300 chars (escaped):\n  " . str_replace(["\n","\r","\t"], ['\\n','\\r','\\t'], $next) . "\n";
} else {
    echo "regex DID NOT MATCH dcc-header self-closing tag\n";
    // Try a relaxed match
    if (preg_match('#<div[^>]*\bdcc-header\b[^>]*>(?:\s*</div>)?#i', $html, $m2, PREG_OFFSET_CAPTURE)) {
        echo "  relaxed match found at " . $m2[0][1] . ": " . substr($m2[0][0], 0, 200) . "\n";
    }
}

$out = L\strip_legacy_title_meta_after_placeholder($html);
echo "strip_legacy_title_meta delta: " . (strlen($out) - strlen($html)) . " bytes\n";

$out2 = L\strip_redundant_title_blocks($html, L\code_from_filename($path));
echo "strip_redundant_title_blocks delta: " . (strlen($out2) - strlen($html)) . " bytes\n";

$code = L\code_from_filename($path);
echo "derived code: $code\n";
