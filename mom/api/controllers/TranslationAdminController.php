<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Services\Translation\CliLoginService;
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
            $svc = new ModelDiscoveryService($this->data, $this->vault());
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

    private function cliLogin(): CliLoginService
    {
        static $svc = null;
        if ($svc === null) {
            $svc = new CliLoginService($this->data);
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
     * Resolve the {provider_key} URL parameter from the router-injected $_GET.
     */
    private function pathProviderKey(): string
    {
        $key = $this->requirePathId('provider_key', 'provider_key');
        if ($key === '') {
            $this->error('translation_provider_key_missing', 422, 'provider_key is required.');
        }
        return $key;
    }

    /**
     * PUT /api/v1/dcc/admin/translation/providers/{provider_key}
     * Body: { "is_enabled": bool }
     */
    public function toggleProvider(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $providerKey = $this->pathProviderKey();
        $body = $this->jsonBody();
        $isEnabled = (bool)($body['is_enabled'] ?? true);

        $this->data->execute(
            'UPDATE translation_provider_config SET is_enabled = :p1, updated_at = now() WHERE provider_key = :p2',
            [':p1' => $isEnabled ? 't' : 'f', ':p2' => $providerKey]
        );
        $this->success(['provider_key' => $providerKey, 'is_enabled' => $isEnabled]);
    }

    // ── Credentials (API key + CLI runtime) ──────────────────────────────────

    /**
     * GET /api/v1/dcc/admin/translation/credentials/{provider_key}
     */
    public function getCredential(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $providerKey = $this->pathProviderKey();
        $row = $this->vault()->describe($providerKey);
        $this->success(['credential' => $row, 'vault_ready' => $this->vault()->isReady()]);
    }

    /**
     * PUT /api/v1/dcc/admin/translation/credentials/{provider_key}
     */
    public function setCredential(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $providerKey = $this->pathProviderKey();
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
     * DELETE /api/v1/dcc/admin/translation/credentials/{provider_key}
     */
    public function deleteCredential(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $providerKey = $this->pathProviderKey();
        $ok = $this->vault()->delete($providerKey);
        $this->success(['deleted' => $ok]);
    }

    /**
     * POST /api/v1/dcc/admin/translation/credentials/{provider_key}/probe
     */
    public function probeCredential(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $providerKey = $this->pathProviderKey();
        $result = $this->cli()->probe($providerKey);
        $this->success(['probe' => $result]);
    }

    /**
     * POST /api/v1/dcc/admin/translation/credentials/{provider_key}/login/start
     *
     * Spawns the CLI's interactive login flow (claude setup-token /
     * codex login --device-auth), captures the auth URL + (codex) device code,
     * returns them so the admin UI can show a modal with a clickable link.
     */
    public function loginStart(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $providerKey = $this->pathProviderKey();
        try {
            $info = $this->cliLogin()->start($providerKey);
        } catch (Throwable $e) {
            $this->error('translation_cli_login_start_failed', 500, $e->getMessage());
        }
        $this->success(['session' => $info]);
    }

    /**
     * POST /api/v1/dcc/admin/translation/credentials/{provider_key}/login/complete
     * Body: { "session_id": "...", "code": "<token-from-browser>" }
     *
     * For Claude: writes the pasted token to the running setup-token process'
     * stdin, waits for credentials.json, returns account info.
     * For Codex device-auth: just polls until process exits (UI may call this
     * repeatedly; returns state="pending" if not yet approved).
     */
    public function loginComplete(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $providerKey = $this->pathProviderKey();
        $body = $this->jsonBody();
        $sessionId = (string)($body['session_id'] ?? '');
        $code = (string)($body['code'] ?? '');
        if ($sessionId === '') {
            $this->error('translation_cli_login_session_missing', 422, 'session_id is required.');
        }
        try {
            if ($code !== '') {
                $result = $this->cliLogin()->completeWithCode($providerKey, $sessionId, $code);
            } else {
                $result = $this->cliLogin()->pollDeviceAuth($providerKey, $sessionId);
            }
        } catch (Throwable $e) {
            $this->error('translation_cli_login_complete_failed', 500, $e->getMessage());
        }
        $this->success(['result' => $result]);
    }

    /**
     * POST /api/v1/dcc/admin/translation/credentials/{provider_key}/logout
     *
     * Wipes credentials, resets last-test state. After this, admin must
     * Connect again to re-authenticate.
     */
    public function loginLogout(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $providerKey = $this->pathProviderKey();
        try {
            $result = $this->cliLogin()->logout($providerKey);
        } catch (Throwable $e) {
            $this->error('translation_cli_logout_failed', 500, $e->getMessage());
        }
        $this->success($result);
    }

    // ── Models (per-provider model list) ─────────────────────────────────────

    public function listModels(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $providerKey = $this->pathProviderKey();
        $models = $this->discovery()->listAvailable($providerKey, false);
        $this->success(['provider_key' => $providerKey, 'models' => $models]);
    }

    public function refreshModels(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $providerKey = $this->pathProviderKey();
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
    public function upsertRouting(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $routingId = (int)($this->input('routing_id') ?? '0');
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
    public function deleteRouting(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $routingId = (int)($this->input('routing_id') ?? '0');
        if ($routingId <= 0) {
            $this->error('translation_routing_id_missing', 422, 'routing_id required');
        }
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
               FROM translation_provider_config WHERE provider_key = :p1',
            [':p1' => $providerKey]
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
                'SELECT cli_binary_path, cli_auth_home_path FROM translation_credentials WHERE provider_key = :p1',
                [':p1' => $providerKey]
            );
            if (is_array($credRow) && isset($credRow[0])) {
                $bin = (string)($credRow[0]['cli_binary_path'] ?? '');
                $home = (string)($credRow[0]['cli_auth_home_path'] ?? '');
                if ($bin !== '') { $env['DCC_CLI_BINARY'] = $bin; }
                if ($home !== '') {
                    $env['DCC_CLI_AUTH_HOME'] = $home;
                    $env['HOME'] = $home;
                    if (str_starts_with($providerKey, 'claude')) {
                        $token = \MOM\Services\Translation\CliRuntimeService::readClaudeOAuthToken($home);
                        if ($token !== null) {
                            $env['ANTHROPIC_AUTH_TOKEN'] = $token;
                        }
                    }
                }
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

    // ── Documents tab ─────────────────────────────────────────────────────────

    private function pathDocCode(): string
    {
        $raw = $this->requirePathId('doc_code', 'doc_code');
        if ($raw === '') {
            $this->error('translation_doc_code_missing', 422, 'doc_code is required.');
        }
        return strtoupper(trim($raw));
    }

    /**
     * GET /api/v1/dcc/admin/translation/documents
     *
     * Paginated list of all documents that have an English locale variant,
     * joined with header data and any per-doc routing override.
     *
     * Query params: page, per_page, search, state
     */
    public function listTranslatedDocuments(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        $page        = max(1, (int)($this->query('page') ?? '1'));
        $perPage     = min(100, max(10, (int)($this->query('per_page') ?? '50')));
        $search      = trim((string)($this->query('search') ?? ''));
        $stateFilter = trim((string)($this->query('state') ?? ''));

        $where  = ["v.locale = 'en'"];
        $params = [];

        if ($search !== '') {
            $where[]            = '(h.doc_code ILIKE :p_srch1 OR h.title ILIKE :p_srch2)';
            $params[':p_srch1'] = '%' . $search . '%';
            $params[':p_srch2'] = '%' . $search . '%';
        }
        if ($stateFilter !== '') {
            $where[]          = 'v.translation_state = :p_state';
            $params[':p_state'] = $stateFilter;
        }

        $whereClause = implode(' AND ', $where);
        $offset      = ($page - 1) * $perPage;

        $rows = $this->data->query(
            "SELECT
                 h.doc_code, h.title, h.doc_type,
                 h.revision AS source_revision, h.status AS source_status,
                 v.translation_state, v.translation_provider, v.engine_version,
                 v.artifact_source_revision AS translated_revision,
                 v.updated_at AS translated_at,
                 r.routing_id AS override_routing_id,
                 r.primary_provider AS override_provider,
                 r.primary_model AS override_model,
                 last_ok.duration_ms AS last_duration_ms,
                 last_ok.provider_key AS last_provider_key,
                 last_ok.model_id AS last_model_id,
                 last_ok.created_at AS last_run_at
             FROM dcc_document_header h
             JOIN dcc_document_locale_variant v
                  ON v.doc_code = h.doc_code AND v.locale = 'en'
             LEFT JOIN translation_routing r
                  ON r.scope_type = 'doc_code'
                  AND r.scope_value = h.doc_code
                  AND r.is_enabled = true
             LEFT JOIN LATERAL (
                  SELECT duration_ms, provider_key, model_id, created_at
                    FROM translation_usage_log
                   WHERE doc_code = h.doc_code AND outcome = 'ok'
                   ORDER BY created_at DESC
                   LIMIT 1
             ) last_ok ON true
             WHERE $whereClause
             ORDER BY v.updated_at DESC NULLS LAST
             LIMIT $perPage OFFSET $offset",
            $params
        );

        $countRow = $this->data->query(
            "SELECT COUNT(*) AS total
             FROM dcc_document_header h
             JOIN dcc_document_locale_variant v
                  ON v.doc_code = h.doc_code AND v.locale = 'en'
             WHERE $whereClause",
            $params
        );

        $this->success([
            'documents' => is_array($rows) ? $rows : [],
            'total'     => (int)(is_array($countRow) && isset($countRow[0]) ? ($countRow[0]['total'] ?? 0) : 0),
            'page'      => $page,
            'per_page'  => $perPage,
        ]);
    }

    /**
     * PUT /api/v1/dcc/admin/translation/documents/{doc_code}/override
     * Body: { "primary_provider": "claude_cli", "primary_model": "sonnet" }
     *
     * Saves a per-document routing override used for all future auto-translations.
     * This is stored as a translation_routing row with scope_type='doc_code'.
     */
    public function setDocumentOverride(): never
    {
        $user    = $this->requireAuth();
        $this->requireAdmin($user);
        $docCode = $this->pathDocCode();
        $body    = $this->jsonBody();
        $actor   = $this->adminActor($user);

        $provider = trim((string)($body['primary_provider'] ?? ''));
        $model    = isset($body['primary_model']) && (string)$body['primary_model'] !== ''
            ? (string)$body['primary_model'] : null;

        if ($provider === '') {
            $this->error('translation_override_missing_provider', 422, 'primary_provider is required.');
        }

        $existing  = $this->data->query(
            "SELECT routing_id FROM translation_routing
              WHERE scope_type = 'doc_code' AND scope_value = :p1",
            [':p1' => $docCode]
        );
        $routingId = is_array($existing) && count($existing) > 0 ? (int)$existing[0]['routing_id'] : 0;

        try {
            $row = $this->registry()->upsertRoutingRule($routingId, [
                'scope_type'       => 'doc_code',
                'scope_value'      => $docCode,
                'primary_provider' => $provider,
                'primary_model'    => $model,
                'fallback_chain'   => [],
                'is_enabled'       => true,
            ], $actor);
        } catch (Throwable $e) {
            $this->error('translation_override_upsert_failed', 500, $e->getMessage());
        }

        $this->success(['rule' => $row]);
    }

    /**
     * DELETE /api/v1/dcc/admin/translation/documents/{doc_code}/override
     *
     * Removes the per-document routing override, reverting to the inherited
     * tier or global-default routing rule.
     */
    public function removeDocumentOverride(): never
    {
        $user    = $this->requireAuth();
        $this->requireAdmin($user);
        $docCode = $this->pathDocCode();

        $this->data->execute(
            "DELETE FROM translation_routing
              WHERE scope_type = 'doc_code' AND scope_value = :p1",
            [':p1' => $docCode]
        );
        $this->success(['deleted' => true, 'doc_code' => $docCode]);
    }

    /**
     * POST /api/v1/dcc/admin/translation/documents/{doc_code}/retranslate
     *
     * Forces a fresh translation of the document, bypassing the content-hash
     * cache. Uses whatever routing rule is currently active for this doc
     * (per-doc override if set, otherwise inherited tier/global rule).
     *
     * The source HTML is read from the path stored in the locale variant's
     * metadata (source_base_rel_path), so the document must have been
     * translated at least once before this endpoint can be called.
     */
    public function retranslateDocument(): never
    {
        $user    = $this->requireAuth();
        $this->requireAdmin($user);
        $docCode = $this->pathDocCode();
        $actor   = $this->adminActor($user);

        $headers = $this->data->query(
            "SELECT doc_code, title, doc_type, revision, status
               FROM dcc_document_header WHERE doc_code = :p1 LIMIT 1",
            [':p1' => $docCode]
        );
        if (!is_array($headers) || count($headers) === 0) {
            $this->error('translation_doc_not_found', 404, "Document $docCode not found.");
        }
        $header = $headers[0];

        $variants = $this->data->query(
            "SELECT metadata FROM dcc_document_locale_variant
              WHERE doc_code = :p1 AND locale = 'en' LIMIT 1",
            [':p1' => $docCode]
        );
        $baseRelPath = '';
        if (is_array($variants) && count($variants) > 0) {
            $meta = $variants[0]['metadata'];
            if (is_string($meta)) {
                $meta = json_decode($meta, true) ?? [];
            }
            if (is_array($meta)) {
                $baseRelPath = (string)($meta['source_base_rel_path'] ?? '');
            }
        }

        if ($baseRelPath === '') {
            $this->error(
                'translation_retranslate_no_source_path', 422,
                "Cannot determine source file path for $docCode. " .
                'The document must have been translated at least once before force-retranslation is available.'
            );
        }

        $absPath = rtrim($this->rootDir, '/') . '/' . ltrim($baseRelPath, '/');
        if (!is_file($absPath)) {
            $this->error('translation_retranslate_file_missing', 422, "Source file not found: $baseRelPath");
        }
        $sourceHtml = (string)@file_get_contents($absPath);
        if (trim($sourceHtml) === '') {
            $this->error('translation_retranslate_empty_file', 422, "Source file is empty: $baseRelPath");
        }

        // Clear the stored source hash so the automation service re-runs the
        // provider instead of serving the cached artifact.
        $this->data->execute(
            "UPDATE dcc_document_locale_variant
                SET artifact_source_hash_sha256 = NULL
              WHERE doc_code = :p1 AND locale = 'en'",
            [':p1' => $docCode]
        );

        $automation = new \MOM\Services\DocumentControl\DocumentLocaleAutomationService(
            $this->data,
            $this->rootDir
        );

        // Always queue: a single LLM call can run minutes (codex_cli/gpt-5
        // routinely takes ~30s per 8-segment batch). PHP-FPM's per-request
        // timeout terminates synchronous calls and returns the FPM HTML 504
        // error page, which trips the admin UI's JSON parser ("Unexpected
        // token '<'"). The queued path writes a job file, spawns a worker via
        // nohup, and returns immediately.
        try {
            $result = $automation->scheduleEnglishMachinePreview([
                'doc_code'      => $docCode,
                'base_rel_path' => $baseRelPath,
                'source_html'   => $sourceHtml,
                'title'         => (string)($header['title'] ?? ''),
                'revision'      => (string)($header['revision'] ?? '0.0'),
                'source_status' => (string)($header['status'] ?? 'draft'),
                'trigger'       => 'admin_force',
                'actor'         => $actor,
                'spawn_worker'  => true,
            ]);
        } catch (Throwable $e) {
            $this->error('translation_retranslate_failed', 500, $e->getMessage());
        }

        $this->success(['doc_code' => $docCode, 'result' => $result, 'queued' => true]);
    }

    /**
     * POST /api/v1/dcc/admin/translation/documents/{doc_code}/cancel-job
     *
     * Aborts an in-flight retranslate job. Kills the worker PHP process and
     * its child python/codex/claude subprocesses, removes the queued job
     * file + lock, and flips the locale variant out of the
     * `queued_background_worker` placeholder state so the UI exits its
     * "đang dịch..." indicator.
     *
     * Idempotent: if the doc is not currently queued, returns ok with
     * canceled=false so the admin doesn't see a spurious error.
     */
    public function cancelJob(): never
    {
        $user    = $this->requireAuth();
        $this->requireAdmin($user);
        $docCode = $this->pathDocCode();
        $actor   = $this->adminActor($user);

        $variantRows = $this->data->query(
            "SELECT translation_state, translation_provider, engine_version, metadata
               FROM dcc_document_locale_variant
              WHERE doc_code = :p1 AND locale = 'en' LIMIT 1",
            [':p1' => $docCode]
        );
        if (!is_array($variantRows) || count($variantRows) === 0) {
            $this->error('translation_cancel_no_variant', 404, "No English variant for $docCode.");
        }
        $variant = $variantRows[0];
        $isQueued = trim((string)($variant['engine_version'] ?? '')) === 'queued_background_worker';

        $metadata = $variant['metadata'];
        if (is_string($metadata)) {
            $metadata = json_decode($metadata, true) ?? [];
        }
        if (!is_array($metadata)) {
            $metadata = [];
        }
        $relJobPath = trim((string)($metadata['queue_job_path'] ?? ''));
        $killed = ['worker_pids' => [], 'child_pids' => [], 'job_file_removed' => false, 'lock_file_removed' => false];

        if ($relJobPath !== '') {
            $absJobPath = rtrim($this->rootDir, '/') . '/' . ltrim($relJobPath, '/');
            // Find every PHP worker whose argv contains this exact job-file
            // path, plus any python/node descendants. The pgrep -f matches
            // against the full command line so the job-path argument is
            // enough to identify our worker uniquely.
            $needle  = escapeshellarg($absJobPath);
            $pidList = trim((string)@shell_exec("pgrep -f $needle 2>/dev/null"));
            $pids    = $pidList === '' ? [] : preg_split('/\s+/', $pidList);
            foreach ($pids as $pid) {
                $pid = (int)$pid;
                if ($pid <= 0 || $pid === getmypid()) {
                    continue;
                }
                $killed['worker_pids'][] = $pid;
                // Kill the whole subtree (php -> python -> codex/claude/node).
                @shell_exec('pkill -TERM -P ' . $pid . ' 2>/dev/null');
                @posix_kill($pid, SIGTERM);
            }
            // Grace period, then SIGKILL anything that survived.
            usleep(800_000);
            foreach ($killed['worker_pids'] as $pid) {
                if (@posix_kill($pid, 0)) {
                    @shell_exec('pkill -KILL -P ' . $pid . ' 2>/dev/null');
                    @posix_kill($pid, SIGKILL);
                }
            }
            // Sweep any descendants spawned earlier by the python provider
            // (codex `node` binary, claude `claude` binary). Match on the
            // job's hash-named tmp output file isn't reliable, so we settle
            // for cleaning up the job + lock and trust the SIGTERM cascade.
            if (is_file($absJobPath)) {
                @unlink($absJobPath);
                $killed['job_file_removed'] = true;
            }
            $lockPath = $absJobPath . '.lock';
            if (is_file($lockPath)) {
                @unlink($lockPath);
                $killed['lock_file_removed'] = true;
            }
        }

        // Restore the variant out of the "queued" placeholder so the UI
        // stops showing the translating indicator. If the doc previously had
        // an artifact, leave its translation_state alone; otherwise mark
        // blocked with a clear reason.
        if ($isQueued) {
            $dcc = new \MOM\Services\DocumentControl\DocumentControlService($this->data);
            $newMetadata = $metadata;
            $newMetadata['canceled_at'] = gmdate(DATE_ATOM);
            $newMetadata['canceled_by'] = $actor;
            unset($newMetadata['queue_job_path'], $newMetadata['queue_spawned'], $newMetadata['queued_at']);

            // Pull the previous variant fields we want to keep stable so the
            // upsert doesn't null them out.
            $previous = $this->data->query(
                "SELECT title, subtitle, artifact_rel_path, artifact_source_revision,
                        artifact_source_hash_sha256, glossary_version
                   FROM dcc_document_locale_variant
                  WHERE doc_code = :p1 AND locale = 'en' LIMIT 1",
                [':p1' => $docCode]
            );
            $prev = (is_array($previous) && isset($previous[0])) ? $previous[0] : [];

            $dcc->upsertLocaleVariant($docCode, 'en', [
                'title' => (string)($prev['title'] ?? ''),
                'subtitle' => $prev['subtitle'] ?? null,
                'artifact_rel_path' => $prev['artifact_rel_path'] ?? null,
                'artifact_source_revision' => $prev['artifact_source_revision'] ?? null,
                'artifact_source_hash_sha256' => $prev['artifact_source_hash_sha256'] ?? null,
                'translation_state' => 'blocked',
                'translation_provider' => 'admin_canceled',
                'glossary_version' => (string)($prev['glossary_version'] ?? ''),
                'engine_version' => 'canceled_by_admin',
                'published_at' => null,
                'metadata' => $newMetadata,
            ], $actor);
        }

        $this->success([
            'doc_code'  => $docCode,
            'was_queued' => $isQueued,
            'canceled'  => $isQueued,
            'killed'    => $killed,
        ]);
    }
}
