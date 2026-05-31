<?php

declare(strict_types=1);

$baseDir = realpath(__DIR__ . '/../..');
if (!is_string($baseDir) || $baseDir === '') {
    fwrite(STDERR, "Unable to resolve mom base directory.\n");
    exit(2);
}

$autoload = $baseDir . '/vendor/autoload.php';
if (is_file($autoload)) {
    require_once $autoload;
} else {
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
            $file = $dir . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
            if (is_file($file)) {
                require_once $file;
                return;
            }
        }
    });
    $uomException = $baseDir . '/api/services/Uom/UomException.php';
    if (is_file($uomException)) {
        require_once $uomException;
    }
}

$runner = new MOM\Api\Services\Scenario\MdaRuntimeScenarioRunner($baseDir . '/data');
$dashboard = $runner->run();

echo json_encode([
    'decision' => $dashboard['decision'] ?? 'UNKNOWN',
    'scenario_total' => $dashboard['scenario_total'] ?? 0,
    'passed' => $dashboard['passed'] ?? 0,
    'failed' => $dashboard['failed'] ?? 0,
    'cutover_decision' => $dashboard['cutover_decision'] ?? '',
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";

exit(($dashboard['decision'] ?? '') === 'P58_PASS_READY_FOR_NEXT' ? 0 : 1);
