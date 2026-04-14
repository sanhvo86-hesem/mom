<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\CacheService;
use MOM\Api\Services\QueueService;
use MOM\Api\Services\LogTransport;
use MOM\Api\Services\RuntimeAuthorityService;
use MOM\Services\EvidenceVaultService;

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
     * SEC-003 FIX (VERIFIED): This endpoint is unauthenticated; error messages are sanitized
     * via collectInfrastructureHealthSanitized() to prevent information disclosure of
     * internal hostnames, ports, and error details.
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

        // Check promoted runtime authority posture.
        try {
            $authority = (new RuntimeAuthorityService($this->data, $dataDir))->report();
        } catch (\Throwable $e) {
            // SECURITY FIX (INF-003): Only return ok flag, not error message
            $authority = ['ok' => false];
        }

        $infra = $this->collectInfrastructureHealthSanitized($dataDir);
        $componentOk = $this->evaluateComponents($infra, $authority);
        foreach ($componentOk as $component => $ok) {
            $checks[$component] = $ok;
            if (!$ok) {
                $allOk = false;
            }
        }

        // SECURITY FIX (INF-003): Return only safe status and check results, no error details
        $this->json([
            'ok'          => $allOk,
            'status'      => $allOk ? 'ready' : 'degraded',
            'checks'      => $checks,
            'degraded_components' => array_values(array_keys(array_filter(
                $componentOk,
                static fn(bool $ok): bool => !$ok,
            ))),
            'server_time' => gmdate('c'),
        ], $allOk ? 200 : 503);
    }

    /**
     * GET /api/health/status - Detailed system status (admin only).
     */
    public function status(): void
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        $dataDir = $GLOBALS['DATA_DIR'] ?? dirname(__DIR__, 2) . '/data';

        $infra = $this->collectInfrastructureHealth($dataDir);

        // Runtime authority
        try {
            $authority = (new RuntimeAuthorityService($this->data, $dataDir))->report();
        } catch (\Throwable $e) {
            $authority = ['ok' => false, 'error' => $e->getMessage()];
        }

        $componentOk = $this->evaluateComponents($infra, $authority);
        $allOk = !in_array(false, $componentOk, true);

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
            'ok'             => $allOk,
            'version'        => '2.1.0',
            'infrastructure' => $infra,
            'authority'      => $authority,
            'health_evaluation' => [
                'components_ok' => $componentOk,
                'degraded_components' => array_values(array_keys(array_filter(
                    $componentOk,
                    static fn(bool $ok): bool => !$ok,
                ))),
            ],
            'php'            => $php,
            'server_time'    => gmdate('c'),
        ], $allOk ? 200 : 503);
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function collectInfrastructureHealth(string $dataDir): array
    {
        $infra = [];

        try {
            $cache = new CacheService($dataDir);
            $infra['redis'] = $cache->getHealth();
        } catch (\Throwable $e) {
            $infra['redis'] = ['available' => false, 'error' => $e->getMessage()];
        }

        try {
            $queue = new QueueService($dataDir);
            $infra['rabbitmq'] = $queue->getHealth();
            $queue->close();
        } catch (\Throwable $e) {
            $infra['rabbitmq'] = ['available' => false, 'error' => $e->getMessage()];
        }

        try {
            $log = new LogTransport($dataDir);
            $infra['logging'] = $log->getHealth();
        } catch (\Throwable $e) {
            $infra['logging'] = ['available' => false, 'error' => $e->getMessage()];
        }

        $infra['legacy_audit_file_sink'] = $this->legacyAuditFileSinkHealth();

        try {
            $infra['evidence_vault'] = (new EvidenceVaultService($dataDir, $this->data))->pgWriteProbe();
        } catch (\Throwable $e) {
            $infra['evidence_vault'] = ['available' => false, 'error' => $e->getMessage()];
        }

        try {
            require_once dirname(__DIR__) . '/services/UploadHardeningService.php';
            $infra['upload_hardening'] = (new \UploadHardeningService($dataDir))->getHealth();
        } catch (\Throwable $e) {
            $infra['upload_hardening'] = ['available' => false, 'error' => $e->getMessage()];
        }

        return $infra;
    }

    /**
     * SECURITY FIX (INF-003): Sanitized version of collectInfrastructureHealth
     * that removes error messages to prevent information disclosure on the
     * unauthenticated /health/ready endpoint.
     *
     * @return array<string, array<string, mixed>>
     */
    private function collectInfrastructureHealthSanitized(string $dataDir): array
    {
        $infra = [];

        try {
            $cache = new CacheService($dataDir);
            $health = $cache->getHealth();
            // Remove error message
            unset($health['error']);
            $infra['redis'] = $health;
        } catch (\Throwable $e) {
            $infra['redis'] = ['available' => false];
        }

        try {
            $queue = new QueueService($dataDir);
            $health = $queue->getHealth();
            $queue->close();
            // Remove error message
            unset($health['error']);
            $infra['rabbitmq'] = $health;
        } catch (\Throwable $e) {
            $infra['rabbitmq'] = ['available' => false];
        }

        try {
            $log = new LogTransport($dataDir);
            $health = $log->getHealth();
            // Remove error message
            unset($health['error']);
            $infra['logging'] = $health;
        } catch (\Throwable $e) {
            $infra['logging'] = ['available' => false];
        }

        $infra['legacy_audit_file_sink'] = $this->legacyAuditFileSinkHealth();

        try {
            $health = (new EvidenceVaultService($dataDir, $this->data))->pgWriteProbe();
            // Remove error message
            unset($health['error']);
            $infra['evidence_vault'] = $health;
        } catch (\Throwable $e) {
            $infra['evidence_vault'] = ['available' => false];
        }

        try {
            require_once dirname(__DIR__) . '/services/UploadHardeningService.php';
            $health = (new \UploadHardeningService($dataDir))->getHealth();
            // Remove error message
            unset($health['error']);
            $infra['upload_hardening'] = $health;
        } catch (\Throwable $e) {
            $infra['upload_hardening'] = ['available' => false];
        }

        return $infra;
    }

    /**
     * @param array<string, array<string, mixed>> $infra
     * @param array<string, mixed> $authority
     * @return array<string, bool>
     */
    private function evaluateComponents(array $infra, array $authority): array
    {
        return [
            'redis' => $this->componentHealthy($infra['redis'] ?? []),
            'rabbitmq' => $this->componentHealthy($infra['rabbitmq'] ?? []),
            'logging' => $this->componentHealthy($infra['logging'] ?? []),
            'legacy_audit_file_sink' => $this->componentHealthy($infra['legacy_audit_file_sink'] ?? []),
            'evidence_vault' => $this->componentHealthy($infra['evidence_vault'] ?? []),
            'upload_hardening' => $this->componentHealthy($infra['upload_hardening'] ?? []),
            'runtime_authority' => (bool)($authority['ok'] ?? false)
                && (bool)($authority['summary']['idempotency_expected_authority_met'] ?? true),
            'runtime_authority_strict' => (bool)($authority['summary']['strict_authority_ready'] ?? false),
        ];
    }

    /**
     * @param mixed $payload
     */
    private function componentHealthy($payload): bool
    {
        if (!is_array($payload)) {
            return false;
        }
        if (isset($payload['error']) && trim((string)$payload['error']) !== '') {
            return false;
        }

        foreach (['ok', 'available', 'healthy', 'redis_available', 'amqp_available', 'loki_available'] as $field) {
            if (array_key_exists($field, $payload) && $payload[$field] === false) {
                return false;
            }
        }

        if (isset($payload['fallback_active']) && $payload['fallback_active'] === true) {
            return false;
        }
        if (isset($payload['fallback_mode']) && !in_array((string)$payload['fallback_mode'], ['', 'none'], true)) {
            return false;
        }
        if (isset($payload['degraded']) && $payload['degraded'] === true) {
            return false;
        }

        return true;
    }

    /**
     * @return array{enabled:bool,degraded:bool,authority_mode:string}
     */
    private function legacyAuditFileSinkHealth(): array
    {
        $enabled = in_array(strtolower((string)getenv('MOM_ENABLE_LEGACY_AUDIT_LOG')), ['1', 'true', 'yes'], true);

        return [
            'enabled' => $enabled,
            'degraded' => $enabled,
            'authority_mode' => $enabled ? 'diagnostic_legacy_file_sink' : 'canonical_audit_store',
        ];
    }
}
