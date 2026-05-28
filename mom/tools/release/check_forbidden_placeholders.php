#!/usr/bin/env php
<?php

declare(strict_types=1);

$root = dirname(__DIR__, 3);
$dataDir = $root . '/mom/data/config';
$forbidden = [
    'PROCESS OWNER',
    'DEPARTMENT HEAD',
    'DATA OWNER',
    'TOP MANAGEMENT',
    'APPROVAL BOARD',
    'RESPONSIBLE DEPARTMENT',
    'TBD',
    'N/A',
];
$files = [
    'raci_control_registry.bootstrap.json',
    'scenario_registry.bootstrap.json',
    'workflow_transition_registry.bootstrap.json',
    'point_of_use_overlays.bootstrap.json',
    'qa_risk_control_registry.bootstrap.json',
    'raci_training_drills.bootstrap.json',
];
$issues = [];
$scanned = 0;

foreach ($files as $file) {
    $path = $dataDir . '/' . $file;
    $data = json_decode((string)file_get_contents($path), true);
    if (!is_array($data)) {
        $issues[] = "{$file}: unreadable json.";
        continue;
    }
    walkValue($data, $file, function (string $pathKey, string $text) use (&$issues, &$scanned, $forbidden): void {
        $upper = strtoupper(trim($text));
        if ($upper === '') {
            return;
        }
        $scanned++;
        foreach ($forbidden as $bad) {
            if ($upper === $bad) {
                $issues[] = "{$pathKey}: forbidden placeholder {$bad}.";
            }
        }
    });
}

fwrite(STDOUT, "Forbidden placeholders\n");
fwrite(STDOUT, "  scanned_values: {$scanned}\n");

if ($issues !== []) {
    foreach ($issues as $issue) {
        fwrite(STDERR, "[P0] {$issue}\n");
    }
    exit(1);
}

/**
 * @param callable(string, string): void $fn
 */
function walkValue(mixed $value, string $path, callable $fn): void
{
    if (is_array($value)) {
        foreach ($value as $key => $child) {
            walkValue($child, $path . '.' . (string)$key, $fn);
        }
        return;
    }
    $fn($path, (string)$value);
}
