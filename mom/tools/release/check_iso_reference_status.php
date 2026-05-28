#!/usr/bin/env php
<?php

declare(strict_types=1);

$root = dirname(__DIR__, 3);
$targets = [
    $root . '/mom/docs/system/organization/04-RACI-Authority',
    $root . '/mom/docs/training/raci-scenario-drills',
    $root . '/mom/docs/operations/references/05-ANNEX-500/annex-599-production-scenario-playbooks.html',
    $root . '/mom/docs/operations/sops/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html',
    $root . '/mom/assets/style.css',
];

$issues = [];
$scanned = 0;

foreach ($targets as $target) {
    if (is_dir($target)) {
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($target));
        foreach ($iterator as $file) {
            if (!$file->isFile()) {
                continue;
            }
            scanFile($file->getPathname(), $issues, $scanned);
        }
        continue;
    }
    if (is_file($target)) {
        scanFile($target, $issues, $scanned);
    }
}

fwrite(STDOUT, "ISO reference status\n");
fwrite(STDOUT, "  files_scanned: {$scanned}\n");

if ($issues !== []) {
    foreach ($issues as $issue) {
        fwrite(STDERR, "[P0] {$issue}\n");
    }
    exit(1);
}

function scanFile(string $path, array &$issues, int &$scanned): void
{
    $scanned++;
    $text = (string)file_get_contents($path);
    if (str_contains($text, 'ISO 9001:2026')) {
        $issues[] = $path . ': references ISO 9001:2026 as if current.';
    }
}
