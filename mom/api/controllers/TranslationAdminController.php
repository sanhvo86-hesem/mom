<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Services\Translation\CliRuntimeService;
use MOM\Services\Translation\ModelDiscoveryService;
use MOM\Services\Translation\ProviderRegistryService;
use MOM\Services\Translation\SecretVaultService;
use MOM\Services\Translation\TranslationUsageRecorder;
use Throwable;

/**
 * Translation Admin — REST surface for the multi-provider control panel.
 *
 * All endpoints are admin-only (requireAdmin). Read endpoints return JSON;
 * write endpoints accept JSON bodies and return the updated row(s).
 *
 * Mounted under /api/v1/dcc/admin/translation/* in dcc-routes.php.
 *
 * Backed by migration 157_translation_admin_module.sql.
 *
 * @since 4.2.0
 */
final class TranslationAdminController extends EqmsBaseController
{
    private function vault(): SecretVaultService
    {
        static $svc = null;
        if ($svc === null) {
            $svc = new SecretVaultService($this->data);
        }
        return $svc;
    }

    private function cli(): CliRuntimeService
    {
        static $svc = null;
        if ($svc === null) {
            $svc = new CliRuntimeService($this->data);
        }
        return $svc;
    }

    private function registry(): ProviderRegistryService
    {
        static $svc = null;
        if ($svc === null) {
            $svc = new ProviderRegistryService($this->data, $this->vault());
        }
        return $svc;
    }

    private function discovery(): ModelDiscoveryService
    {
        static $svc = null;
        if ($svc === null) {
            $svc = new ModelDiscoveryService($this->data, $this->vault(), $this->cli());
        }
        return $svc;
    }

    private function recorder(): TranslationUsageRecorder
    {
        static $svc = null;
        if ($svc === null) {
            $svc = new TranslationUsageRecorder($this->data, $this->rootDir);
        }
        return $svc;
    }

    private function adminActor(array $user): string
    {
        return (string)($user['username'] ?? $user['user_id'] ?? $user['id'] ?? 'admin');
    }

    // ── Providers (registry) ─────────────────────────────────────────────────

    /**
     * GET /api/v1/dcc/admin/translation/providers
     *
     * Returns every provider row with capabilities and (when applicable)
     * the credential/CLI runtime state. Used by the UI to render the
     * "API Keys" / "CLI Runtime" tab.
     */
    public function listProviders(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        $providers = $this->registry()->listProviders();
        $vaultReady = $this->vault()->isReady();
        $enriched = array_map(function (array $p): array {
            $p['credential'] = $this->vault()->describe((string)$p['provider_key']);
            return $p;
        }, $providers);

        $this->success([
            'providers' => $enriched,
            'vault_ready' => $vaultReady,
            'vault_setup_hint' => $vaultReady ? null : 'Set APP_SECRET_KEY in the environment (>=32 random bytes) and reload PHP-FPM before saving API keys.',
        ]);
    }

    /**
     * PUT /api/v1/dcc/admin/translation/providers/{key}
     * Body: { "is_enabled": bool }
     */
    public function toggleProvider(string $providerKey): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $body = $this->jsonBody();
        $isEnabled = (bool)($body['is_enabled'] ?? true);

        $this->data->execute(
            'UPDATE translation_provider_config SET is_enabled = $1, updated_at = now() WHERE provider_key = $2',
            [$isEnabled ? 't' : 'f', $providerKey]
        );
        $this->success(['provider_key' => $providerKey, 'is_enabled' => $isEnabled]);
    }

    // ── Credentials (API key + CLI runtime) ──────────────────────────────────

    /**
     * GET /api/v1/dcc/admin/translation/credentials/{key}
     *
     * Returns the safe-to-display credential row (no ciphertext, no key).
     */
    public function getCredential(string $providerKey): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $row = $this->vault()->describe($providerKey);
        $this->success(['credential' => $row, 'vault_ready' => $this->vault()->isReady()]);
    }

    /**
     * PUT /api/v1/dcc/admin/translation/credentials/{key}
     * Body for API key:    { "api_key": "sk-..." }
     * Body for CLI runtime: { "cli_binary_path": "...", "cli_auth_home_path": "..." }
     */
    public function setCredential(string $providerKey): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $body = $this->jsonBody();
        $actor = $this->adminActor($user);

        if (isset($body['api_key']) && $body['api_key'] !== '') {
            try {
                $info = $this->vault()->store($providerKey, (string)$body['api_key'], $actor);
            } catch (Throwable $e) {
                $this->error('translation_vault_error', 500, $e->getMessage());
            }
            $this->success(['fingerprint' => $info['fingerprint']]);
        }

        if (isset($body['cli_binary_path']) || isset($body['cli_auth_home_path'])) {
            $this->cli()->configure($providerKey, [
                'cli_binary_path' => $body['cli_binary_path'] ?? null,
                'cli_auth_home_path' => $body['cli_auth_home_path'] ?? null,
            ], $actor);
            $this->success(['credential' => $this->vault()->describe($providerKey)]);
        }

        $this->error('translation_credential_payload_invalid', 422, 'Body must contain api_key or cli_binary_path/cli_auth_home_path.');
    }

    /**
     * DELETE /api/v1/dcc/admin/translation/credentials/{key}
     */
    public function deleteCredential(string $providerKey): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $ok = $this->vault()->delete($providerKey);
        $this->success(['deleted' => $ok]);
    }

    /**
     * POST /api/v1/dcc/admin/translation/credentials/{key}/probe
     *
     * Runs the CLI probe (binary --version + ping prompt). Updates
     * last_test_* columns. Returns the result.
     */
    public function probeCredential(string $providerKey): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $result = $this->cli()->probe($providerKey);
        $this->success(['probe' => $result]);
    }

    // ── Models (per-provider model list) ─────────────────────────────────────

    /**
     * GET /api/v1/dcc/admin/translation/models/{key}
     */
    public function listModels(string $providerKey): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $models = $this->discovery()->listAvailable($providerKey, false);
        $this->success(['provider_key' => $providerKey, 'models' => $models]);
    }

    /**
     * POST /api/v1/dcc/admin/translation/models/{key}/refresh
     */
    public function refreshModels(string $providerKey): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $models = $this->discovery()->refresh($providerKey);
        $this->success(['provider_key' => $providerKey, 'models' => $models]);
    }

    // ── Routing ──────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/dcc/admin/translation/routing
     */
    public function listRouting(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $rules = $this->registry()->listRoutingRules();
        $this->success(['rules' => $rules]);
    }

    /**
     * POST /api/v1/dcc/admin/translation/routing
     * PUT  /api/v1/dcc/admin/translation/routing/{routing_id}
     */
    public function upsertRouting(int $routingId = 0): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $body = $this->jsonBody();
        try {
            $row = $this->registry()->upsertRoutingRule($routingId, $body, $this->adminActor($user));
        } catch (Throwable $e) {
            $this->error('translation_routing_upsert_failed', 500, $e->getMessage());
        }
        $this->success(['rule' => $row]);
    }

    /**
     * DELETE /api/v1/dcc/admin/translation/routing/{routing_id}
     */
    public function deleteRouting(int $routingId): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $ok = $this->registry()->deleteRoutingRule($routingId);
        if (!$ok) {
            $this->error('translation_routing_delete_blocked', 409, 'Cannot delete the global_default rule or rule does not exist.');
        }
        $this->success(['deleted' => true]);
    }

    /**
     * GET /api/v1/dcc/admin/translation/resolve?doc_code=QMS-MAN-001&doc_type=MAN
     *
     * Preview which provider would handle a given doc with the current
     * routing rules. Useful for the "test routing" UI.
     */
    public function resolveDocument(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $docCode = (string)($this->query('doc_code') ?? '');
        $docType = $this->query('doc_type');
        if ($docCode === '') {
            $this->error('translation_resolve_missing_doc', 422, 'doc_code is required.');
        }
        $resolution = $this->registry()->describeResolution($docCode, is_string($docType) ? $docType : null);
        $this->success($resolution);
    }

    // ── Usage / cost dashboard ───────────────────────────────────────────────

    /**
     * GET /api/v1/dcc/admin/translation/usage?days=30
     */
    public function usageSummary(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $days = (int)($this->query('days') ?? '30');
        if ($days < 1 || $days > 365) {
            $days = 30;
        }
        $summary = $this->recorder()->summarise($days);
        $recent = $this->recorder()->recentAttempts(50);
        $this->success(['summary' => $summary, 'recent' => $recent]);
    }

    // ── Test bench ───────────────────────────────────────────────────────────

    /**
     * POST /api/v1/dcc/admin/translation/test
     * Body: { "providers": [{provider_key, model}], "source_html": "...", "title": "...", "subtitle": "..." }
     *
     * Runs the same input through 1..N providers in parallel and returns
     * each result for side-by-side comparison. Logs each call as
     * trigger_kind="admin_test".
     */
    public function testBench(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $body = $this->jsonBody();
        $providers = is_array($body['providers'] ?? null) ? $body['providers'] : [];
        $sourceHtml = (string)($body['source_html'] ?? '');
        $title = (string)($body['title'] ?? '');
        $subtitle = (string)($body['subtitle'] ?? '');
        if ($sourceHtml === '' || $providers === []) {
            $this->error('translation_test_missing_params', 422, 'source_html and providers[] are required.');
        }
        // Cap to 10 concurrent providers to avoid abuse.
        $providers = array_slice($providers, 0, 10);

        $results = [];
        foreach ($providers as $entry) {
            if (!is_array($entry)) { continue; }
            $providerKey = (string)($entry['provider_key'] ?? '');
            $modelId = isset($entry['model']) ? (string)$entry['model'] : null;
            $results[] = $this->runSingleTest($providerKey, $modelId, $sourceHtml, $title, $subtitle);
        }

        $this->success(['results' => $results]);
    }

    /**
     * @return array<string, mixed>
     */
    private function runSingleTest(string $providerKey, ?string $modelId, string $sourceHtml, string $title, string $subtitle): array
    {
        if ($providerKey === '') {
            return ['provider_key' => '', 'ok' => false, 'message' => 'empty provider_key'];
        }
        $providerRow = $this->data->query(
            'SELECT driver_command, default_options, capabilities, provider_kind
               FROM translation_provider_config WHERE provider_key = $1',
            [$providerKey]
        );
        if (!is_array($providerRow) || count($providerRow) === 0) {
            return ['provider_key' => $providerKey, 'ok' => false, 'message' => 'unknown provider'];
        }
        $command = (string)$providerRow[0]['driver_command'];
        $kind = (string)$providerRow[0]['provider_kind'];

        // Build env overlay similar to ProviderAttempt::buildEnvOverlay
        $env = ['DCC_PROVIDER_KEY' => $providerKey, 'DCC_PROVIDER_KIND' => $kind];
        if ($modelId !== null && $modelId !== '') {
            $env['DCC_PROVIDER_MODEL'] = $modelId;
        }
        if ($kind === 'http_api') {
            $apiKey = $this->vault()->reveal($providerKey);
            if ($apiKey !== null) { $env['DCC_PROVIDER_API_KEY'] = $apiKey; }
        }
        if ($kind === 'cli_subscription') {
            $credRow = $this->data->query(
                'SELECT cli_binary_path, cli_auth_home_path FROM translation_credentials WHERE provider_key = $1',
                [$providerKey]
            );
            if (is_array($credRow) && isset($credRow[0])) {
                $bin = (string)($credRow[0]['cli_binary_path'] ?? '');
                $home = (string)($credRow[0]['cli_auth_home_path'] ?? '');
                if ($bin !== '') { $env['DCC_CLI_BINARY'] = $bin; }
                if ($home !== '') { $env['DCC_CLI_AUTH_HOME'] = $home; $env['HOME'] = $home; }
            }
        }

        $payload = json_encode([
            'source_html' => $sourceHtml,
            'title' => $title,
            'subtitle' => $subtitle,
            'glossary_version' => 'admin_test',
            'trigger' => 'admin_test',
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';

        $startMs = (int)(microtime(true) * 1000);
        $result = $this->spawnDriver($command, $payload, $env);
        $durationMs = (int)(microtime(true) * 1000) - $startMs;

        $decoded = json_decode($result['stdout'], true);
        $ok = is_array($decoded) && (bool)($decoded['ok'] ?? false);

        // Log it
        $usage = is_array($decoded) ? ($decoded['usage'] ?? []) : [];
        $this->recorder()->record(
            null, $providerKey, $modelId, 'admin_test',
            (int)($usage['input_tokens'] ?? 0) ?: null,
            (int)($usage['cached_input_tokens'] ?? 0) ?: null,
            (int)($usage['output_tokens'] ?? 0) ?: null,
            $durationMs,
            $ok ? 'ok' : 'api_error',
            $ok ? null : (string)($decoded['reason'] ?? 'driver_failed'),
        );

        return [
            'provider_key' => $providerKey,
            'model_id' => $modelId,
            'ok' => $ok,
            'duration_ms' => $durationMs,
            'response' => is_array($decoded) ? $decoded : ['raw_stdout' => mb_substr($result['stdout'], 0, 4000)],
            'stderr_excerpt' => mb_substr($result['stderr'], 0, 2000),
            'exit_code' => $result['exit'],
        ];
    }

    /**
     * @param array<string,string> $envOverlay
     * @return array{stdout:string, stderr:string, exit:int}
     */
    private function spawnDriver(string $command, string $stdinPayload, array $envOverlay): array
    {
        $spec = [0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']];
        $envFull = array_merge($_ENV ?: getenv(), $envOverlay);
        $proc = @proc_open(
            ['/bin/sh', '-lc', 'exec ' . $command],
            $spec, $pipes, $this->rootDir, $envFull
        );
        if (!is_resource($proc)) {
            return ['stdout'=>'', 'stderr'=>'proc_open failed', 'exit'=>127];
        }
        fwrite($pipes[0], $stdinPayload);
        fclose($pipes[0]);
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);
        $stdout = '';
        $stderr = '';
        $deadline = microtime(true) + 120;
        while (true) {
            $stdout .= (string)stream_get_contents($pipes[1]);
            $stderr .= (string)stream_get_contents($pipes[2]);
            $status = proc_get_status($proc);
            if (!$status['running']) { break; }
            if (microtime(true) >= $deadline) {
                proc_terminate($proc, 9);
                fclose($pipes[1]); fclose($pipes[2]);
                proc_close($proc);
                return ['stdout'=>$stdout,'stderr'=>$stderr."\n[timeout]",'exit'=>124];
            }
            usleep(80000);
        }
        $stdout .= (string)stream_get_contents($pipes[1]);
        $stderr .= (string)stream_get_contents($pipes[2]);
        fclose($pipes[1]); fclose($pipes[2]);
        $exit = proc_close($proc);
        return ['stdout'=>$stdout,'stderr'=>$stderr,'exit'=>$exit];
    }
}
