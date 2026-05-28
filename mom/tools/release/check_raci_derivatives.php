#!/usr/bin/env php
<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/vendor/autoload.php';

use MOM\Api\Services\RaciDerivativeIntegrityService;

$root = dirname(__DIR__, 3);
$dataDir = $root . '/mom/data';

$result = (new RaciDerivativeIntegrityService($root, $dataDir))->audit();

fwrite(STDOUT, "RACI derivative integrity\n");
fwrite(STDOUT, "  documents scanned: " . (string)$result['documents_scanned'] . "\n");
fwrite(STDOUT, "  generated regions: " . (string)$result['regions_scanned'] . "\n");
fwrite(STDOUT, "  status: " . ($result['valid'] ? 'clean' : 'drift') . "\n");

if (!$result['valid']) {
    foreach ($result['issues'] as $issue) {
        fwrite(STDERR, sprintf("[%s] %s — %s\n", $issue['severity'], $issue['path'], $issue['message']));
    }
    exit(1);
}
