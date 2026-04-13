<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\CacheService;
use MOM\Api\Services\QueueService;
use MOM\Api\Services\LogTransport;

/**
 * HealthController - Kubernetes-ready health check endpoints.
 *
 * Provides liveness and readiness probes for container orchestration,
 * plus a detailed status endpoint for observability dashboards.
 *
 * @package MOM\Api\Controllers
 * @since   2.1.0
 */
class HealthController extends BaseController
{
    /**
     * GET /api/health/live - Liveness probe.
     * Returns 200 if the process is alive. No dependency checks.
     */
    public function live(): void
    {
        $this->json([
            'ok'          => true,
            'status'      => 'alive',
            'server_time' => gmdate('c'),
        ]);
    }

    /**
     * GET /api/health/ready - Readiness probe.
     * Returns 200 if the service can handle requests (DB, cache accessible).
     */
    public function ready(): void
    {
        $checks = [];
        $allOk = true;

        // Check data directory writable
        $dataDir = $GLOBALS['DATA_DIR'] ?? dirname(__DIR__, 2) . '/data';
        $checks['data_dir'] = is_writable($dataDir);
        if (!$checks['data_dir']) $allOk = false;

        // Check user store loaded
        $store = $GLOBALS['store'] ?? null;
        $checks['user_store'] = $store !== null;
        if (!$checks['user_store']) $allOk = false;

        $this->json([
            'ok'          => $allOk,
            'status'      => $allOk ? 'ready' : 'not_ready',
            'checks'      => $checks,
            'server_time' => gmdate('c'),
        ], $allOk ? 200 : 503);
    }

    /**
     * GET /api/health/status - Detailed system status (admin only).
     */
    public function status(): void
    {
        $dataDir = $GLOBALS['DATA_DIR'] ?? dirname(__DIR__, 2) . '/data';

        // Infrastructure health
        $infra = [];

        // Redis
        try {
            $cache = new CacheService($dataDir);
            $infra['redis'] = $cache->getHealth();
        } catch (\Throwable $e) {
            $infra['redis'] = ['available' => false, 'error' => $e->getMessage()];
        }

        // RabbitMQ
        try {
            $queue = new QueueService($dataDir);
            $infra['rabbitmq'] = $queue->getHealth();
            $queue->close();
        } catch (\Throwable $e) {
            $infra['rabbitmq'] = ['available' => false, 'error' => $e->getMessage()];
        }

        // Logging
        try {
            $log = new LogTransport($dataDir);
            $infra['logging'] = $log->getHealth();
        } catch (\Throwable $e) {
            $infra['logging'] = ['available' => false, 'error' => $e->getMessage()];
        }

        // PHP info
        $php = [
            'version'        => PHP_VERSION,
            'memory_limit'   => ini_get('memory_limit'),
            'memory_usage'   => round(memory_get_usage(true) / 1024 / 1024, 2) . 'MB',
            'memory_peak'    => round(memory_get_peak_usage(true) / 1024 / 1024, 2) . 'MB',
            'extensions'     => array_filter([
                'pdo_pgsql' => extension_loaded('pdo_pgsql'),
                'redis'     => extension_loaded('redis'),
                'mbstring'  => extension_loaded('mbstring'),
                'curl'      => extension_loaded('curl'),
                'json'      => extension_loaded('json'),
            ]),
        ];

        $this->json([
            'ok'             => true,
            'version'        => '2.1.0',
            'infrastructure' => $infra,
            'php'            => $php,
            'server_time'    => gmdate('c'),
        ]);
    }
}
