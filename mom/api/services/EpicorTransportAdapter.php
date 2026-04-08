<?php

declare(strict_types=1);

namespace MOM\Services;

use RuntimeException;

/**
 * Governed HTTP transport adapter for Epicor Kinetic REST integration.
 *
 * The adapter is safe to keep enabled in source control because credentials
 * are read only from environment variables or a local deployment override.
 * When transport is not configured, the adapter can stay in dry-run mode so
 * schedulers and health checks still work without mutating runtime state.
 */
final class EpicorTransportAdapter
{
    private readonly string $dataDir;
    /** @var array<string, mixed> */
    private array $policy;
    /** @var array<string, mixed>|null */
    private ?array $tokenCache = null;
    private ?CircuitBreaker $circuitBreaker = null;

    public function __construct(string $dataDir)
    {
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->policy = $this->loadPolicy();

        $stateDir = $this->dataDir . '/state';
        $this->circuitBreaker = new CircuitBreaker($stateDir, 'epicor', 3, 60);
    }

    /** @return array<string, mixed> */
    public function healthSnapshot(): array
    {
        $config = $this->transportConfig();
        return [
            'system_name' => (string)($this->policy['system_name'] ?? 'Epicor Kinetic'),
            'configured' => $this->isConfigured(),
            'dry_run' => (bool)($config['dry_run_when_unconfigured'] ?? true),
            'auth_mode' => (string)($config['auth_mode'] ?? 'oauth2_client_credentials'),
            'base_url' => (string)($config['base_url'] ?? ''),
            'token_url' => (string)($config['token_url'] ?? ''),
            'timeout_seconds' => (int)($config['timeout_seconds'] ?? 20),
            'verify_tls' => (bool)($config['verify_tls'] ?? true),
            'company' => (string)($config['company'] ?? ''),
            'plant' => (string)($config['plant'] ?? ''),
            'paths' => (array)($config['api_paths'] ?? []),
            'circuit_breaker' => $this->circuitBreaker?->getStatus() ?? [],
        ];
    }

    /** @return array<string, mixed> */
    public function pullSalesOrders(string $checkpoint = ''): array
    {
        return $this->requestJson('GET', $this->servicePath('sales_orders'), [
            'changedSince' => $checkpoint,
        ], null, 'sales_orders');
    }

    /** @return array<string, mixed> */
    public function pullJobOrders(string $checkpoint = ''): array
    {
        return $this->requestJson('GET', $this->servicePath('job_orders'), [
            'changedSince' => $checkpoint,
        ], null, 'job_orders');
    }

    /** @return array<string, mixed> */
    public function pullWorkOrders(string $checkpoint = ''): array
    {
        return $this->requestJson('GET', $this->servicePath('work_orders'), [
            'changedSince' => $checkpoint,
        ], null, 'work_orders');
    }

    /** @return array<string, mixed> */
    public function pullMasterData(string $domain = 'master_data', string $checkpoint = ''): array
    {
        return $this->requestJson('GET', $this->servicePath('master_data'), [
            'domain' => $domain,
            'changedSince' => $checkpoint,
        ], null, 'master_data');
    }

    /** @param array<string, mixed> $payload
     *  @return array<string, mixed>
     */
    public function pushLabor(array $payload): array
    {
        return $this->requestJson('POST', $this->servicePath('labor'), [], $payload, 'labor');
    }

    /** @param array<string, mixed> $payload
     *  @return array<string, mixed>
     */
    public function pushMaterial(array $payload): array
    {
        return $this->requestJson('POST', $this->servicePath('material'), [], $payload, 'material');
    }

    /** @param array<string, mixed> $payload
     *  @return array<string, mixed>
     */
    public function pushCompletion(array $payload): array
    {
        return $this->requestJson('POST', $this->servicePath('completions'), [], $payload, 'completions');
    }

    /** @param array<string, mixed> $payload
     *  @return array<string, mixed>
     */
    public function pushQualityResult(array $payload): array
    {
        return $this->requestJson('POST', $this->servicePath('quality'), [], $payload, 'quality');
    }

    public function isConfigured(): bool
    {
        $config = $this->transportConfig();
        $baseUrl = trim((string)($config['base_url'] ?? ''));
        $authMode = strtolower(trim((string)($config['auth_mode'] ?? 'oauth2_client_credentials')));
        if ($baseUrl === '') {
            return false;
        }
        if ($authMode === 'api_key') {
            return trim((string)($config['api_key'] ?? '')) !== '';
        }
        return trim((string)($config['client_id'] ?? '')) !== ''
            && trim((string)($config['client_secret'] ?? '')) !== ''
            && trim((string)($config['token_url'] ?? '')) !== '';
    }

    /** @return array<string, mixed> */
    private function requestJson(string $method, string $path, array $query, ?array $payload, string $domain): array
    {
        $config = $this->transportConfig();
        $dryRun = (bool)($config['dry_run_when_unconfigured'] ?? true);
        if (!$this->isConfigured()) {
            return [
                'ok' => false,
                'skipped' => $dryRun,
                'error' => 'transport_not_configured',
                'status_code' => 0,
                'domain' => $domain,
                'message' => $dryRun
                    ? 'Epicor transport is not configured; dry-run mode left the payload in queue.'
                    : 'Epicor transport is not configured.',
                'response' => [],
            ];
        }

        // Circuit breaker: fail fast when Epicor is unavailable
        if ($this->circuitBreaker !== null && !$this->circuitBreaker->allowRequest()) {
            $status = $this->circuitBreaker->getStatus();
            return [
                'ok' => false,
                'skipped' => false,
                'error' => 'circuit_open',
                'status_code' => 0,
                'domain' => $domain,
                'message' => 'Epicor circuit breaker is OPEN (failures: ' . $status['failure_count'] . '). Retry after recovery timeout.',
                'response' => ['circuit_breaker' => $status],
            ];
        }

        $headers = [
            'Accept: application/json',
        ];
        if ($payload !== null) {
            $headers[] = 'Content-Type: application/json';
        }
        foreach ($this->authorizationHeaders($config) as $header) {
            $headers[] = $header;
        }

        try {
        $response = $this->httpRequest(
            $method,
            $this->buildUrl($config, $path, $query),
            $headers,
            $payload !== null ? json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null,
            (int)($config['timeout_seconds'] ?? 20),
            (bool)($config['verify_tls'] ?? true),
        );

        $body = trim((string)($response['body'] ?? ''));
        $decoded = $body !== '' ? json_decode($body, true) : null;
        $statusCode = (int)($response['status_code'] ?? 0);
        $ok = $statusCode >= 200 && $statusCode < 300;

        if ($ok) {
            $this->circuitBreaker?->recordSuccess();
        } else {
            $this->circuitBreaker?->recordFailure();
        }

        return [
            'ok' => $ok,
            'skipped' => false,
            'error' => $ok ? '' : ('http_' . $statusCode),
            'status_code' => $statusCode,
            'domain' => $domain,
            'message' => $ok ? 'Epicor transport call completed.' : ('Epicor transport call failed with HTTP ' . $statusCode . '.'),
            'response' => is_array($decoded) ? $decoded : ['raw' => $body],
            'headers' => (array)($response['headers'] ?? []),
        ];
        } catch (\Throwable $e) {
            $this->circuitBreaker?->recordFailure();
            throw $e;
        }
    }

    /** @return array<int, string> */
    private function authorizationHeaders(array $config): array
    {
        $authMode = strtolower(trim((string)($config['auth_mode'] ?? 'oauth2_client_credentials')));
        if ($authMode === 'api_key') {
            $apiKey = trim((string)($config['api_key'] ?? ''));
            $headerName = trim((string)($config['api_key_header'] ?? 'X-API-Key'));
            if ($apiKey === '') {
                throw new RuntimeException('missing_epicor_api_key');
            }
            return [$headerName . ': ' . $apiKey];
        }

        $token = $this->authenticate($config);
        return ['Authorization: Bearer ' . $token];
    }

    private function authenticate(array $config): string
    {
        if (is_array($this->tokenCache)) {
            $expiresAt = (int)($this->tokenCache['expires_at_epoch'] ?? 0);
            if ($expiresAt === 0 || $expiresAt > (time() + 30)) {
                return (string)($this->tokenCache['access_token'] ?? '');
            }
        }

        $tokenUrl = trim((string)($config['token_url'] ?? ''));
        $clientId = trim((string)($config['client_id'] ?? ''));
        $clientSecret = trim((string)($config['client_secret'] ?? ''));
        if ($tokenUrl === '' || $clientId === '' || $clientSecret === '') {
            throw new RuntimeException('missing_epicor_oauth_credentials');
        }

        $scope = trim((string)($config['scope'] ?? ''));
        $form = [
            'grant_type' => 'client_credentials',
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
        ];
        if ($scope !== '') {
            $form['scope'] = $scope;
        }

        $response = $this->httpRequest(
            'POST',
            $tokenUrl,
            ['Accept: application/json', 'Content-Type: application/x-www-form-urlencoded'],
            http_build_query($form, '', '&', PHP_QUERY_RFC3986),
            (int)($config['timeout_seconds'] ?? 20),
            (bool)($config['verify_tls'] ?? true),
        );

        $body = trim((string)($response['body'] ?? ''));
        $decoded = $body !== '' ? json_decode($body, true) : null;
        $statusCode = (int)($response['status_code'] ?? 0);
        if ($statusCode < 200 || $statusCode >= 300 || !is_array($decoded)) {
            throw new RuntimeException('epicor_oauth_failed');
        }

        $token = trim((string)($decoded['access_token'] ?? ''));
        if ($token === '') {
            throw new RuntimeException('missing_epicor_access_token');
        }

        $expiresIn = max(60, (int)($decoded['expires_in'] ?? 3600));
        $this->tokenCache = [
            'access_token' => $token,
            'expires_at_epoch' => time() + $expiresIn,
        ];
        return $token;
    }

    /** @return array<string, mixed> */
    private function httpRequest(string $method, string $url, array $headers, ?string $body, int $timeoutSeconds, bool $verifyTls): array
    {
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            if ($ch === false) {
                throw new RuntimeException('epicor_transport_curl_init_failed');
            }
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CUSTOMREQUEST => strtoupper($method),
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_CONNECTTIMEOUT => max(3, $timeoutSeconds),
                CURLOPT_TIMEOUT => max(3, $timeoutSeconds),
                CURLOPT_SSL_VERIFYPEER => $verifyTls,
                CURLOPT_SSL_VERIFYHOST => $verifyTls ? 2 : 0,
                CURLOPT_HEADER => true,
            ]);
            if ($body !== null) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
            }
            $raw = curl_exec($ch);
            if ($raw === false) {
                $error = curl_error($ch);
                curl_close($ch);
                throw new RuntimeException($error !== '' ? $error : 'epicor_transport_curl_failed');
            }
            $statusCode = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            $headerSize = (int)curl_getinfo($ch, CURLINFO_HEADER_SIZE);
            $rawHeaders = substr($raw, 0, $headerSize);
            $rawBody = substr($raw, $headerSize);
            curl_close($ch);
            return [
                'status_code' => $statusCode,
                'headers' => preg_split("/\r\n|\n|\r/", trim($rawHeaders)) ?: [],
                'body' => $rawBody,
            ];
        }

        $context = stream_context_create([
            'http' => [
                'method' => strtoupper($method),
                'header' => implode("\r\n", $headers),
                'content' => $body ?? '',
                'ignore_errors' => true,
                'timeout' => max(3, $timeoutSeconds),
            ],
            'ssl' => [
                'verify_peer' => $verifyTls,
                'verify_peer_name' => $verifyTls,
            ],
        ]);

        $rawBody = @file_get_contents($url, false, $context);
        if ($rawBody === false) {
            $error = error_get_last();
            throw new RuntimeException((string)($error['message'] ?? 'epicor_transport_http_failed'));
        }
        $responseHeaders = is_array($http_response_header ?? null) ? $http_response_header : [];
        $statusCode = 0;
        if (!empty($responseHeaders[0]) && preg_match('/\s(\d{3})\s/', (string)$responseHeaders[0], $matches)) {
            $statusCode = (int)$matches[1];
        }
        return [
            'status_code' => $statusCode,
            'headers' => $responseHeaders,
            'body' => $rawBody,
        ];
    }

    /** @return array<string, mixed> */
    private function transportConfig(): array
    {
        $transport = is_array($this->policy['transport'] ?? null) ? $this->policy['transport'] : [];
        $transport['auth_mode'] = (string)(getenv('EPICOR_AUTH_MODE') ?: ($transport['auth_mode'] ?? 'oauth2_client_credentials'));
        $transport['base_url'] = (string)(getenv('EPICOR_BASE_URL') ?: ($transport['base_url'] ?? ''));
        $transport['token_url'] = (string)(getenv('EPICOR_TOKEN_URL') ?: ($transport['token_url'] ?? ''));
        $transport['client_id'] = (string)(getenv('EPICOR_CLIENT_ID') ?: ($transport['client_id'] ?? ''));
        $transport['client_secret'] = (string)(getenv('EPICOR_CLIENT_SECRET') ?: ($transport['client_secret'] ?? ''));
        $transport['api_key'] = (string)(getenv('EPICOR_API_KEY') ?: ($transport['api_key'] ?? ''));
        $transport['scope'] = (string)(getenv('EPICOR_SCOPE') ?: ($transport['scope'] ?? ''));
        $transport['company'] = (string)(getenv('EPICOR_COMPANY') ?: ($transport['company'] ?? ''));
        $transport['plant'] = (string)(getenv('EPICOR_PLANT') ?: ($transport['plant'] ?? ''));
        $transport['timeout_seconds'] = max(5, (int)(getenv('EPICOR_TIMEOUT_SECONDS') ?: ($transport['timeout_seconds'] ?? 20)));
        $transport['verify_tls'] = filter_var(getenv('EPICOR_VERIFY_TLS') ?: ($transport['verify_tls'] ?? true), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($transport['verify_tls'] === null) {
            $transport['verify_tls'] = true;
        }
        $transport['dry_run_when_unconfigured'] = filter_var(getenv('EPICOR_DRY_RUN') ?: ($transport['dry_run_when_unconfigured'] ?? true), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($transport['dry_run_when_unconfigured'] === null) {
            $transport['dry_run_when_unconfigured'] = true;
        }
        $transport['api_paths'] = is_array($transport['api_paths'] ?? null) ? $transport['api_paths'] : [];
        return $transport;
    }

    private function servicePath(string $domain): string
    {
        $paths = (array)(($this->transportConfig())['api_paths'] ?? []);
        return trim((string)($paths[$domain] ?? ''));
    }

    private function buildUrl(array $config, string $path, array $query): string
    {
        $baseUrl = rtrim(trim((string)($config['base_url'] ?? '')), '/');
        $relative = ltrim($path, '/');
        $url = $baseUrl . '/' . $relative;
        $query = array_filter($query, static fn($value) => $value !== null && $value !== '');
        if (!empty($query)) {
            $url .= '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986);
        }
        return $url;
    }

    /** @return array<string, mixed> */
    private function loadPolicy(): array
    {
        $file = $this->dataDir . '/config/epicor_integration_policy.json';
        if (!is_file($file)) {
            return [];
        }
        $raw = file_get_contents($file);
        $data = is_string($raw) ? json_decode($raw, true) : null;
        return is_array($data) ? $data : [];
    }
}
