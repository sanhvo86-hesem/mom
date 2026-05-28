#!/usr/bin/env php
<?php

declare(strict_types=1);

$root = dirname(__DIR__, 3);

require_once $root . '/mom/api/services/FileHelper.php';
require_once $root . '/mom/api/services/ScenarioRegistryService.php';

use MOM\Api\Services\ScenarioRegistryService;

$result = (new ScenarioRegistryService($root, $root . '/mom/data'))->validate();

fwrite(STDOUT, "Scenario coverage\n");
foreach ($result['summary'] as $key => $value) {
    fwrite(STDOUT, "  {$key}: {$value}\n");
}
if (!$result['valid']) {
    foreach ($result['issues'] as $issue) {
        fwrite(STDERR, sprintf("[%s] %s — %s\n", $issue['severity'], $issue['path'], $issue['message']));
    }
    exit(1);
}
