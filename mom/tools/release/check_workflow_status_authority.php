#!/usr/bin/env php
<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/vendor/autoload.php';

use MOM\Services\ControlPlane\WorkflowStatusAuthorityService;

$root = dirname(__DIR__, 3);
$configFile = $root . '/mom/data/config/so_jo_wo_config.json';
$registryFile = $root . '/mom/contracts/table-registry.json';

$config = json_decode((string)file_get_contents($configFile), true);
$registry = json_decode((string)file_get_contents($registryFile), true);
if (!is_array($config) || !is_array($registry)) {
    fwrite(STDERR, "workflow status authority inputs are unreadable\n");
    exit(2);
}

$result = (new WorkflowStatusAuthorityService())->validate($config, $registry);
foreach ($result['findings'] as $finding) {
    fwrite(STDERR, sprintf(
        "[%s] %s %s %s\n",
        (string)$finding['severity'],
        (string)$finding['code'],
        (string)$finding['table'],
        (string)$finding['workflow_id'],
    ));
}

if (!$result['valid']) {
    fwrite(STDERR, sprintf("workflow status authority blocking violations: %d\n", count($result['findings'])));
    exit(1);
}

fwrite(STDOUT, "workflow status authority clean\n");
