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

$strictP2 = in_array('--strict-p2', $argv, true);
$blockingFindings = [];
foreach ($findings as $finding) {
    $severity = (string)$finding['severity'];
    $stream = $severity === 'P2' && !$strictP2 ? STDOUT : STDERR;
    fwrite(
        $stream,
        sprintf(
            "[%s] %s %s\n",
            $severity,
            (string)$finding['violation_type'],
            (string)$finding['path'],
        ),
    );

    if ($severity !== 'P2' || $strictP2) {
        $blockingFindings[] = $finding;
    }
}

if ($blockingFindings !== []) {
    fwrite(STDERR, sprintf("repo boundary blocking violations: %d of %d total\n", count($blockingFindings), count($findings)));
    exit(1);
}

fwrite(STDOUT, sprintf("repo boundary warnings only: %d P2 findings; P0/P1 clean\n", count($findings)));
exit(0);
