#!/usr/bin/env php
<?php

declare(strict_types=1);

$root = dirname(__DIR__, 2);

require_once $root . '/mom/api/services/MdaExecutableScenarioRunnerService.php';

use MOM\Services\MdaExecutableScenarioRunnerService;

$options = [
    'source' => $root . '/_reports/agent-audits/mda-prompt-os-2026-05-29/MDA_SIMULATION_MASTER_LIBRARY.csv',
    'minimum_required_count' => 200,
    'final_acceptance' => false,
];

foreach (array_slice($argv, 1) as $arg) {
    if (str_starts_with($arg, '--source=')) {
        $options['source'] = substr($arg, strlen('--source='));
        continue;
    }
    if (str_starts_with($arg, '--declared-count=')) {
        $options['declared_count'] = (int)substr($arg, strlen('--declared-count='));
        continue;
    }
    if (str_starts_with($arg, '--minimum-required-count=')) {
        $options['minimum_required_count'] = (int)substr($arg, strlen('--minimum-required-count='));
        continue;
    }
    if ($arg === '--final-acceptance') {
        $options['final_acceptance'] = true;
    }
}

$result = (new MdaExecutableScenarioRunnerService())->runFromCsv((string)$options['source'], $options);

fwrite(STDOUT, json_encode([
    'status' => $result['status'],
    'reason_code' => $result['reason_code'],
    'dashboard' => $result['dashboard'],
    'evidence_export_hash_sha256' => $result['evidence_export']['export_hash_sha256'],
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . PHP_EOL);

exit($result['status'] === 'blocked' ? 1 : 0);
