<?php

declare(strict_types=1);

$baseDir = realpath(__DIR__ . '/..');
if (!is_string($baseDir) || $baseDir === '') {
    throw new RuntimeException('Unable to resolve project base directory.');
}

$rootDir = realpath($baseDir . '/..');
if (!is_string($rootDir) || $rootDir === '') {
    throw new RuntimeException('Unable to resolve project root directory.');
}

$dataDir = $baseDir . '/data';

spl_autoload_register(static function (string $class) use ($baseDir): void {
    $map = [
        'MOM\\Api\\Controllers\\' => $baseDir . '/api/controllers/',
        'MOM\\Api\\Middleware\\' => $baseDir . '/api/middleware/',
        'MOM\\Api\\Validators\\' => $baseDir . '/api/validators/',
        'MOM\\Api\\Services\\' => $baseDir . '/api/services/',
        'MOM\\Services\\' => $baseDir . '/api/services/',
        'MOM\\Api\\' => $baseDir . '/api/',
        'MOM\\Database\\' => $baseDir . '/database/',
    ];

    foreach ($map as $prefix => $dir) {
        if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
            continue;
        }
        $relativeClass = substr($class, strlen($prefix));
        $file = $dir . str_replace('\\', '/', $relativeClass) . '.php';
        if (is_file($file)) {
            require_once $file;
            return;
        }
    }
});

if (!defined('API_HELPERS_ONLY')) {
    define('API_HELPERS_ONLY', true);
}
if (!defined('API_THROW_RESPONSES')) {
    define('API_THROW_RESPONSES', true);
}
if (!defined('QMS_TEST_BASE_DIR')) {
    define('QMS_TEST_BASE_DIR', $baseDir);
}
if (!defined('QMS_TEST_ROOT_DIR')) {
    define('QMS_TEST_ROOT_DIR', $rootDir);
}
if (!defined('QMS_TEST_DATA_DIR')) {
    define('QMS_TEST_DATA_DIR', $dataDir);
}

// Seed runtime config files from their *.bootstrap.json counterparts when
// the runtime file is absent (happens in CI where gitignored files do not
// exist). Idempotent: skips any file already present (local dev / VPS).
foreach ([
    $dataDir . '/config',
    $dataDir . '/config/deploy',
] as $configDir) {
    foreach (glob($configDir . '/*.bootstrap.json') ?: [] as $bootstrap) {
        $runtime = preg_replace('/\.bootstrap\.json$/', '.json', $bootstrap);
        if ($runtime !== null && !file_exists($runtime)) {
            copy($bootstrap, $runtime);
        }
    }
}

require_once $baseDir . '/api.php';

function smoke_assert(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}
