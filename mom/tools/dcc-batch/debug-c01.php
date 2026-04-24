<?php
$html = file_get_contents('/var/www/eqms.hesemeng.com/mom/docs/training/content/01-Modules/C01.html');
$codeRe = preg_quote('C01', '#');

echo "Test 1 — card+grid-2 only:\n";
echo preg_match('#<div\s+class="card">\s*<div\s+class="grid-2">#i', $html) ? "  MATCH\n" : "  NO MATCH\n";

echo "Test 2 — full chain up to badge:\n";
echo preg_match('#<div\s+class="card">\s*<div\s+class="grid-2">\s*<div>\s*<div\s+class="badge">#i', $html) ? "  MATCH\n" : "  NO MATCH\n";

echo "Test 3 — plus dot span:\n";
echo preg_match('#<div\s+class="card">\s*<div\s+class="grid-2">\s*<div>\s*<div\s+class="badge"><span\s+class="dot"></span>#i', $html) ? "  MATCH\n" : "  NO MATCH\n";

echo "Test 4 — plus code reference:\n";
echo preg_match('#<div\s+class="card">\s*<div\s+class="grid-2">\s*<div>\s*<div\s+class="badge"><span\s+class="dot"></span>[^<]*' . $codeRe . '#i', $html) ? "  MATCH\n" : "  NO MATCH\n";

echo "Test 5 — plus </div><h1>:\n";
echo preg_match('#<div\s+class="card">\s*<div\s+class="grid-2">\s*<div>\s*<div\s+class="badge"><span\s+class="dot"></span>[^<]*' . $codeRe . '[^<]*</div>\s*<h1\b[^>]*>#i', $html) ? "  MATCH\n" : "  NO MATCH\n";

// Show actual content character-by-character
$pos = stripos($html, '<div class="card">');
echo "\nFirst 200 chars at card:\n";
echo "  " . substr($html, $pos, 200) . "\n";
