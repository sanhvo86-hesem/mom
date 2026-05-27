<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use RuntimeException;
use Throwable;

/**
 * LlmExtractionRouterService — picks the right provider+model for a
 * given AEOI extraction call and dispatches it. Reads routing rules
 * from aeoi_llm_routing (migration 207). Supports fallback chain.
 *
 * Resolution order (highest priority wins):
 *   doc_code   > doc_pattern > tier > global_default
 *
 * If no rule resolves and Anthropic API key is set, falls back to the
 * legacy OrderEmailParserService::extractOrder() path so the system
 * stays usable on a fresh install before any rules are seeded.
 *
 * @package MOM\Api\Services
 */
final class LlmExtractionRouterService
{
    private const T_ROUTING  = 'aeoi_llm_routing';
    private const T_PROVIDER = 'translation_provider_config';

    public function __construct(
        private readonly Connection $db
    ) {}

    /**
     * Run extraction against the configured tier. Returns the parsed
     * JSON or throws RuntimeException with detailed reasons.
     *
     * @param array<string,mixed> $context  Same shape as OrderEmailParserService::extractOrder()
     * @return array{result:array<string,mixed>, provider:string, model:string, attempts:list<array{provider:string,model:string,error:?string}>}
     */
    public function extract(string $bodyText, array $context = [], string $tier = 'extraction_default', ?string $docCode = null): array
    {
        $chain = $this->resolveChain($tier, $docCode);
        if ($chain === []) {
            // Final fallback: bare OrderEmailParserService (Anthropic API)
            // if it's configured. Keeps the system functional on a fresh
            // install before any routing rules are seeded.
            if (OrderEmailParserService::isConfigured()) {
                $svc = new OrderEmailParserService();
                $result = $svc->extractOrder($bodyText, $context);
                return [
                    'result'   => $result,
                    'provider' => 'anthropic_api',
                    'model'    => 'claude-haiku-4-5',
                    'attempts' => [['provider' => 'anthropic_api', 'model' => 'claude-haiku-4-5', 'error' => null]],
                ];
            }
            throw new RuntimeException(
                'No LLM routing rule found and no Anthropic API key configured. '
                . 'Seed aeoi_llm_routing or set ANTHROPIC_API_KEY env var.'
            );
        }

        $attempts = [];
        $lastErr  = '';
        foreach ($chain as $step) {
            $provider = (string)($step['provider'] ?? '');
            $model    = (string)($step['model']    ?? '');
            try {
                $result = $this->dispatch($provider, $model, $bodyText, $context);
                $attempts[] = ['provider' => $provider, 'model' => $model, 'error' => null];
                return [
                    'result'   => $result,
                    'provider' => $provider,
                    'model'    => $model,
                    'attempts' => $attempts,
                ];
            } catch (Throwable $e) {
                $lastErr    = $e->getMessage();
                $attempts[] = [
                    'provider' => $provider,
                    'model'    => $model,
                    'error'    => mb_substr($lastErr, 0, 300),
                ];
                @error_log("[AEOI LLM] {$provider}/{$model} failed: {$lastErr}");
                continue;
            }
        }

        throw new RuntimeException(
            'All LLM providers in chain failed. Last error: ' . $lastErr
            . ' (attempted ' . count($attempts) . ' provider(s)).'
        );
    }

    /**
     * Resolve the ordered provider chain for a given (tier, doc_code).
     * Returns a list of {provider, model} pairs — the primary first,
     * fallbacks after. Empty list means no rule found.
     *
     * @return list<array{provider:string, model:string}>
     */
    public function resolveChain(string $tier, ?string $docCode = null): array
    {
        $rule = null;

        // 1. doc_code (most specific) — only if caller provided one
        if ($docCode !== null && $docCode !== '') {
            $rule = $this->lookupRule('doc_code', $docCode);
        }

        // 2. doc_pattern — glob match. PostgreSQL LIKE wildcards.
        if ($rule === null && $docCode !== null && $docCode !== '') {
            $rule = $this->db->queryOne(
                'SELECT * FROM ' . self::T_ROUTING
                . " WHERE scope_type = 'doc_pattern' AND is_enabled = TRUE
                       AND :p_code LIKE replace(replace(scope_value, '*', '%'), '?', '_')
                   ORDER BY priority DESC, routing_id ASC LIMIT 1",
                [':p_code' => $docCode]
            );
        }

        // 3. tier
        if ($rule === null) {
            $rule = $this->lookupRule('tier', $tier);
        }

        // 4. global_default
        if ($rule === null) {
            $rule = $this->lookupRule('global_default', '*');
        }

        if ($rule === null) {
            return [];
        }

        $chain = [[
            'provider' => (string)$rule['primary_provider'],
            'model'    => (string)$rule['primary_model'],
        ]];
        $fallback = json_decode((string)($rule['fallback_chain'] ?? '[]'), true);
        if (is_array($fallback)) {
            foreach ($fallback as $step) {
                if (is_array($step) && isset($step['provider'])) {
                    $chain[] = [
                        'provider' => (string)$step['provider'],
                        'model'    => (string)($step['model'] ?? ''),
                    ];
                }
            }
        }
        return $chain;
    }

    /**
     * List enabled providers + their declared candidate_models for the
     * admin UI dropdown.
     *
     * @return list<array{provider_key:string, display_name:string, provider_kind:string, models:list<string>, enabled:bool}>
     */
    public function listProvidersForUi(): array
    {
        $rows = $this->db->query(
            'SELECT provider_key, display_name, provider_kind, capabilities, is_enabled
               FROM ' . self::T_PROVIDER . '
              ORDER BY provider_kind, display_name'
        );
        $out = [];
        foreach ($rows as $r) {
            $cap = json_decode((string)($r['capabilities'] ?? '{}'), true);
            $models = is_array($cap) && isset($cap['candidate_models'])
                ? (array)$cap['candidate_models']
                : [];
            $out[] = [
                'provider_key' => (string)$r['provider_key'],
                'display_name' => (string)$r['display_name'],
                'provider_kind'=> (string)$r['provider_kind'],
                'models'       => array_values(array_map('strval', $models)),
                'enabled'      => (bool)$r['is_enabled'],
            ];
        }
        return $out;
    }

    /**
     * List all routing rules for the admin UI table.
     *
     * @return list<array<string,mixed>>
     */
    public function listRulesForUi(): array
    {
        $rows = $this->db->query(
            'SELECT routing_id, scope_type, scope_value, primary_provider,
                    primary_model, fallback_chain, priority, is_enabled,
                    description, updated_at, updated_by
               FROM ' . self::T_ROUTING . '
              ORDER BY priority DESC, scope_type, scope_value'
        );
        foreach ($rows as &$r) {
            $r['fallback_chain'] = json_decode((string)($r['fallback_chain'] ?? '[]'), true) ?: [];
        }
        unset($r);
        return $rows;
    }

    /**
     * Upsert a routing rule. Validates provider_key exists. Returns row.
     *
     * @param array<string,mixed> $data
     * @return array<string,mixed>
     */
    public function saveRule(array $data, string $actor): array
    {
        $scopeType  = (string)($data['scope_type']  ?? '');
        $scopeValue = (string)($data['scope_value'] ?? '');
        $primary    = (string)($data['primary_provider'] ?? '');
        $model      = trim((string)($data['primary_model'] ?? '')) ?: null;
        $fallback   = is_array($data['fallback_chain'] ?? null) ? $data['fallback_chain'] : [];
        $priority   = (int)($data['priority'] ?? 100);
        $enabled    = isset($data['is_enabled']) ? (bool)$data['is_enabled'] : true;
        $desc       = trim((string)($data['description'] ?? '')) ?: null;

        if (!in_array($scopeType, ['global_default', 'tier', 'doc_pattern', 'doc_code'], true)) {
            throw new RuntimeException('Invalid scope_type.');
        }
        if ($scopeType === 'global_default' && $scopeValue !== '*') {
            $scopeValue = '*';
        }
        if ($scopeType === 'tier' && !in_array($scopeValue, [
            'extraction_default', 'extraction_pdf', 'extraction_complex'
        ], true)) {
            throw new RuntimeException('Tier scope_value must be one of extraction_default | extraction_pdf | extraction_complex.');
        }
        if ($primary === '') {
            throw new RuntimeException('primary_provider is required.');
        }
        $providerExists = $this->db->queryOne(
            'SELECT 1 FROM ' . self::T_PROVIDER . ' WHERE provider_key = :p',
            [':p' => $primary]
        );
        if (!$providerExists) {
            throw new RuntimeException("Unknown provider_key: {$primary}");
        }

        // Normalise fallback chain
        $cleanChain = [];
        foreach ($fallback as $step) {
            if (!is_array($step) || empty($step['provider'])) {
                continue;
            }
            $cleanChain[] = [
                'provider' => (string)$step['provider'],
                'model'    => (string)($step['model'] ?? ''),
            ];
        }

        $existing = $this->db->queryOne(
            'SELECT routing_id FROM ' . self::T_ROUTING
            . ' WHERE scope_type = :p_type AND scope_value = :p_val',
            [':p_type' => $scopeType, ':p_val' => $scopeValue]
        );

        if ($existing) {
            $this->db->execute(
                'UPDATE ' . self::T_ROUTING . '
                    SET primary_provider = :p_provider,
                        primary_model    = :p_model,
                        fallback_chain   = :p_chain::jsonb,
                        priority         = :p_priority,
                        is_enabled       = :p_enabled,
                        description      = :p_desc,
                        updated_at       = NOW(),
                        updated_by       = :p_actor
                  WHERE routing_id       = :p_id',
                [
                    ':p_provider' => $primary,
                    ':p_model'    => $model,
                    ':p_chain'    => json_encode($cleanChain),
                    ':p_priority' => $priority,
                    ':p_enabled'  => $enabled ? 'true' : 'false',
                    ':p_desc'     => $desc,
                    ':p_actor'    => $actor,
                    ':p_id'       => (int)$existing['routing_id'],
                ]
            );
        } else {
            $this->db->execute(
                'INSERT INTO ' . self::T_ROUTING . '
                    (scope_type, scope_value, primary_provider, primary_model,
                     fallback_chain, priority, is_enabled, description,
                     created_by, updated_by)
                 VALUES (:p_type, :p_val, :p_provider, :p_model,
                         :p_chain::jsonb, :p_priority, :p_enabled, :p_desc,
                         :p_actor, :p_actor)',
                [
                    ':p_type'     => $scopeType,
                    ':p_val'      => $scopeValue,
                    ':p_provider' => $primary,
                    ':p_model'    => $model,
                    ':p_chain'    => json_encode($cleanChain),
                    ':p_priority' => $priority,
                    ':p_enabled'  => $enabled ? 'true' : 'false',
                    ':p_desc'     => $desc,
                    ':p_actor'    => $actor,
                ]
            );
        }

        $row = $this->db->queryOne(
            'SELECT * FROM ' . self::T_ROUTING
            . ' WHERE scope_type = :p_type AND scope_value = :p_val',
            [':p_type' => $scopeType, ':p_val' => $scopeValue]
        );
        if ($row && isset($row['fallback_chain'])) {
            $row['fallback_chain'] = json_decode((string)$row['fallback_chain'], true) ?: [];
        }
        return $row ?? [];
    }

    public function deleteRule(int $routingId): void
    {
        $this->db->execute(
            'DELETE FROM ' . self::T_ROUTING . ' WHERE routing_id = :p_id',
            [':p_id' => $routingId]
        );
    }

    /**
     * Health-check every enabled provider. Used by the admin UI to show
     * green/red dots per row.
     *
     * @return array<string, array{ok:bool, message:string, models:list<string>}>
     */
    public function healthAll(): array
    {
        $providers = $this->db->query(
            'SELECT provider_key, provider_kind, driver_command, capabilities
               FROM ' . self::T_PROVIDER . ' WHERE is_enabled = TRUE'
        );
        $out = [];
        foreach ($providers as $p) {
            $key = (string)$p['provider_key'];
            try {
                if ($key === 'ollama_local') {
                    $svc = new OllamaService((string)$p['driver_command']);
                    $out[$key] = $svc->health();
                } elseif ($key === 'anthropic_api') {
                    $out[$key] = [
                        'ok'      => OrderEmailParserService::isConfigured(),
                        'models'  => ['claude-haiku-4-5','claude-sonnet-4-6','claude-opus-4-7'],
                        'message' => OrderEmailParserService::isConfigured()
                            ? 'ANTHROPIC_API_KEY env var present.'
                            : 'ANTHROPIC_API_KEY env var missing.',
                    ];
                } else {
                    $out[$key] = [
                        'ok'      => false,
                        'models'  => [],
                        'message' => 'Health probe not implemented for ' . $key,
                    ];
                }
            } catch (Throwable $e) {
                $out[$key] = [
                    'ok'      => false,
                    'models'  => [],
                    'message' => $e->getMessage(),
                ];
            }
        }
        return $out;
    }

    // ── Internals ────────────────────────────────────────────────────────

    private function lookupRule(string $scopeType, string $scopeValue): ?array
    {
        $row = $this->db->queryOne(
            'SELECT * FROM ' . self::T_ROUTING . '
              WHERE scope_type = :p_type
                AND scope_value = :p_val
                AND is_enabled = TRUE
              ORDER BY priority DESC, routing_id ASC
              LIMIT 1',
            [':p_type' => $scopeType, ':p_val' => $scopeValue]
        );
        return is_array($row) ? $row : null;
    }

    /**
     * @param array<string,mixed> $context
     * @return array<string,mixed>
     */
    private function dispatch(string $provider, string $model, string $bodyText, array $context): array
    {
        switch ($provider) {
            case 'ollama_local':
                $baseUrl = $this->providerDriverCommand($provider) ?: OllamaService::DEFAULT_BASE_URL;
                $svc     = new OllamaService($baseUrl, $model !== '' ? $model : OllamaService::DEFAULT_MODEL);
                return $svc->extractOrder($bodyText, $context);

            case 'anthropic_api':
                if (!OrderEmailParserService::isConfigured()) {
                    throw new RuntimeException('Anthropic API key not configured (ANTHROPIC_API_KEY env var).');
                }
                $svc = new OrderEmailParserService(null, $model !== '' ? $model : null);
                return $svc->extractOrder($bodyText, $context);

            case 'openai_api':
                throw new RuntimeException('openai_api provider not yet implemented.');

            case 'claude_cli':
            case 'codex_cli':
                throw new RuntimeException("$provider provider not yet implemented for AEOI (translation-only).");

            default:
                throw new RuntimeException("Unknown provider key: $provider");
        }
    }

    private function providerDriverCommand(string $providerKey): string
    {
        $row = $this->db->queryOne(
            'SELECT driver_command FROM ' . self::T_PROVIDER
            . ' WHERE provider_key = :p',
            [':p' => $providerKey]
        );
        return $row ? (string)$row['driver_command'] : '';
    }
}
