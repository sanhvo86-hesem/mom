#!/usr/bin/env php
<?php

declare(strict_types=1);

$root = dirname(__DIR__, 3);
$docsDir = $root . '/mom/docs';
$inventory = $root . '/_reports/raci-v3/01-managed-region-inventory.csv';

if (!is_file($inventory)) {
    fwrite(STDERR, "ERROR: marker inventory not found: {$inventory}\n");
    exit(2);
}

$expected = max(0, count(file($inventory, FILE_IGNORE_NEW_LINES)) - 1);
$actual = 0;
$issues = [];

$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($docsDir));
foreach ($iterator as $file) {
    if (!$file->isFile() || strtolower($file->getExtension()) !== 'html') {
        continue;
    }
    $html = (string)file_get_contents($file->getPathname());
    preg_match_all('/<!--\s*RACI-(MATRIX|ROLES):START\s+([^>]*)-->/', $html, $matches, PREG_SET_ORDER);
    foreach ($matches as $match) {
        $actual++;
        if (trim((string)$match[2]) === '') {
            $issues[] = 'Empty marker metadata in ' . $file->getPathname();
        }
    }
}

fwrite(STDOUT, "Generated marker inventory\n");
fwrite(STDOUT, "  expected_regions: {$expected}\n");
fwrite(STDOUT, "  actual_regions: {$actual}\n");

if ($actual !== $expected) {
    $issues[] = "Marker inventory mismatch: expected {$expected}, got {$actual}.";
}

if ($issues !== []) {
    foreach ($issues as $issue) {
        fwrite(STDERR, "[P0] {$issue}\n");
    }
    exit(1);
}
