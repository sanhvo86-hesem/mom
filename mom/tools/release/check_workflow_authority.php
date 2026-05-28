#!/usr/bin/env php
<?php

declare(strict_types=1);

$root = dirname(__DIR__, 3);

require_once $root . '/mom/api/services/FileHelper.php';
require_once $root . '/mom/api/services/RaciControlRegistryService.php';
require_once $root . '/mom/api/services/ScenarioRegistryService.php';
require_once $root . '/mom/api/services/AuthorityWorkflowGuardService.php';

use MOM\Api\Services\AuthorityWorkflowGuardService;

$result = (new AuthorityWorkflowGuardService($root, $root . '/mom/data'))->validate();

fwrite(STDOUT, "Workflow authority\n");
foreach ($result['summary'] as $key => $value) {
    fwrite(STDOUT, "  {$key}: {$value}\n");
}
if (!$result['valid']) {
    foreach ($result['issues'] as $issue) {
        fwrite(STDERR, sprintf("[%s] %s — %s\n", $issue['severity'], $issue['path'], $issue['message']));
    }
    exit(1);
}
