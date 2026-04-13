#!/usr/bin/env php
<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/api/services/ControlPlane/RepoBoundaryScanner.php';

use MOM\Services\ControlPlane\RepoBoundaryScanner;

$root = dirname(__DIR__, 3);
$git = trim((string)shell_exec('command -v git 2>/dev/null'));
if ($git === '') {
    fwrite(STDERR, "git is required for repo boundary checks\n");
    exit(2);
}

$output = [];
$status = 0;
exec('git -C ' . escapeshellarg($root) . ' ls-files', $output, $status);
if ($status !== 0) {
    fwrite(STDERR, "Unable to list tracked files\n");
    exit(2);
}

$findings = (new RepoBoundaryScanner())->scanPaths($output);
if ($findings === []) {
    fwrite(STDOUT, "repo boundary clean\n");
    exit(0);
}

foreach ($findings as $finding) {
    fwrite(
        STDERR,
        sprintf(
            "[%s] %s %s\n",
            (string)$finding['severity'],
            (string)$finding['violation_type'],
            (string)$finding['path'],
        ),
    );
}

fwrite(STDERR, sprintf("repo boundary violations: %d\n", count($findings)));
exit(1);
