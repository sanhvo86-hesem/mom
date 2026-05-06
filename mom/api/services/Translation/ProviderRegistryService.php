<?php

declare(strict_types=1);

namespace MOM\Services\Translation;

use MOM\Database\DataLayer;

/**
 * Resolves the provider+model+command for a given document.
 *
 * Resolution order (highest priority wins):
 *   1. doc_code        — exact match (e.g. "QMS-MAN-001")
 *   2. doc_pattern     — glob match (e.g. "qms-man-*")
 *   3. tier            — tier_1 / tier_2 / tier_3 (derived from doc_type)
 *   4. global_default  — single fallback row with scope_value="*"
 *
 * Tier inference (doc_type → tier):
 *   tier_1: MAN, POL, MAN_DEPT
 *   tier_2: SOP, WI, ANNEX_RTC
 *   tier_3: FRM, JD, ANNEX, TRN, REG, others
 *
 * After picking the primary provider, the resolution also returns a
 * fallback chain. Caller (DocumentLocaleAutomationService) iterates: if
 * primary fails (API error, quality gate, timeout), it tries each fallback
 * in order. Every attempt is logged via TranslationUsageRecorder.
 */
final class ProviderRegistryService
{
    private const TIER_BY_DOC_TYPE = [
        'MAN'      => 'tier_1',
        'MAN_DEPT' => 'tier_1',
        'POL'      => 'tier_1',
        'SOP'      => 'tier_2',
        'WI'       => 'tier_2',
        'ANNEX_RTC'=> 'tier_2',
        'FRM'      => 'tier_3',
        'JD'       => 'tier_3',
        'ANNEX'    => 'tier_3',
        'TRN'      => 'tier_3',
        'REG'      => 'tier_3',
    ];

    public function __construct(
        private readonly DataLayer $data,
        private readonly SecretVaultService $vault,
    ) {}

    /**
     * Build the ordered list of provider attempts for a document.
     *
     * @param string $docCode    e.g. "QMS-MAN-001"
     * @param string|null $docType e.g. "MAN" — used for tier inference
     * @return list<ProviderAttempt> First element is primary; rest are fallbacks.
     */
    public function resolveAttempts(string $docCode, ?string $docType): array
    {
        $rule = $this->lookupRoutingRule($docCode, $docType);
        if ($rule === null) {
            return [];
        }
        $providersById = $this->loadProviderMap();

        $attempts = [];
        $primary = $this->buildAttempt($providersById, $rule['primary_provider'], $rule['primary_model'] ?? null,
                                       $rule['options_override'] ?? null);
        if ($primary !== null) {
            $attempts[] = $primary;
        }

        $fallbackChain = $this->decodeJsonArray($rule['fallback_chain'] ?? '[]');
        foreach ($fallbackChain as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            $providerKey = (string)($entry['provider'] ?? '');
            $modelId = isset($entry['model']) ? (string)$entry['model'] : null;
            $att = $this->buildAttempt($providersById, $providerKey, $modelId, null);
            if ($att !== null) {
                $att->isFallback = true;
                $attempts[] = $att;
            }
        }
        return $attempts;
    }

    /**
     * Convenience for admin "what would resolve for this doc?" preview.
     *
     * @return array<string, mixed>
     */
    public function describeResolution(string $docCode, ?string $docType): array
    {
        $attempts = $this->resolveAttempts($docCode, $docType);
        $tier = $docType !== null ? (self::TIER_BY_DOC_TYPE[strtoupper($docType)] ?? 'tier_3') : null;
        return [
            'doc_code' => $docCode,
            'doc_type' => $docType,
            'inferred_tier' => $tier,
            'attempts' => array_map(fn (ProviderAttempt $a) => [
                'provider_key' => $a->providerKey,
                'model_id' => $a->modelId,
                'is_fallback' => $a->isFallback,
                'driver_command' => $a->driverCommand,
                'cost_class' => $a->costClass,
                'options' => $a->options,
            ], $attempts),
        ];
    }

    public function tierForDocType(?string $docType): string
    {
        if ($docType === null || $docType === '') {
            return 'tier_3';
        }
        return self::TIER_BY_DOC_TYPE[strtoupper($docType)] ?? 'tier_3';
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function listProviders(): array
    {
        $rows = $this->data->query(
            'SELECT provider_key, display_name, provider_kind, driver_command,
                    capabilities, default_options, is_enabled,
                    health_status, health_checked_at, health_message,
                    created_at, updated_at
               FROM translation_provider_config
              ORDER BY provider_kind, display_name'
        );
        if (!is_array($rows)) {
            return [];
        }
        return array_values(array_map(function (array $row): array {
            $row['capabilities'] = $this->decodeJsonObject($row['capabilities'] ?? '{}');
            $row['default_options'] = $this->decodeJsonObject($row['default_options'] ?? '{}');
            return $row;
        }, $rows));
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function listRoutingRules(): array
    {
        $rows = $this->data->query(
            'SELECT routing_id, scope_type, scope_value, primary_provider, primary_model,
                    fallback_chain, options_override, priority, is_enabled, description,
                    created_by, created_at, updated_by, updated_at
               FROM translation_routing
              ORDER BY (CASE scope_type
                          WHEN \'doc_code\' THEN 4
                          WHEN \'doc_pattern\' THEN 3
                          WHEN \'tier\' THEN 2
                          WHEN \'global_default\' THEN 1
                          ELSE 0
                       END) DESC,
                       priority DESC,
                       scope_value'
        );
        if (!is_array($rows)) {
            return [];
        }
        return array_values(array_map(function (array $row): array {
            $row['fallback_chain'] = $this->decodeJsonArray($row['fallback_chain'] ?? '[]');
            $row['options_override'] = $this->decodeJsonObject($row['options_override'] ?? '{}');
            return $row;
        }, $rows));
    }

    /**
     * @param array<string, mixed> $patch
     */
    public function upsertRoutingRule(int $routingId, array $patch, ?string $actor): array
    {
        $allowed = ['scope_type','scope_value','primary_provider','primary_model',
                    'fallback_chain','options_override','priority','is_enabled','description'];
        $clean = array_intersect_key($patch, array_flip($allowed));
        if (isset($clean['fallback_chain'])) {
            $clean['fallback_chain'] = json_encode($clean['fallback_chain'] ?: [], JSON_UNESCAPED_SLASHES);
        }
        if (isset($clean['options_override'])) {
            $clean['options_override'] = json_encode($clean['options_override'] ?: null, JSON_UNESCAPED_SLASHES);
        }
        if ($routingId > 0) {
            $sets = [];
            $params = [];
            $idx = 1;
            foreach ($clean as $col => $val) {
                $sets[] = "{$col} = \${$idx}";
                $params[] = $val;
                $idx++;
            }
            $sets[] = "updated_by = \${$idx}"; $params[] = $actor; $idx++;
            $sets[] = "updated_at = now()";
            $params[] = $routingId;
            $sql = 'UPDATE translation_routing SET ' . implode(', ', $sets) .
                   " WHERE routing_id = \${$idx}";
            $this->data->execute($sql, $params);
            $row = $this->data->query('SELECT * FROM translation_routing WHERE routing_id = $1', [$routingId]);
            return is_array($row) && isset($row[0]) ? $row[0] : [];
        }
        // Insert
        $cols = array_keys($clean);
        $cols[] = 'created_by';
        $cols[] = 'updated_by';
        $vals = array_values($clean);
        $vals[] = $actor;
        $vals[] = $actor;
        $placeholders = array_map(fn ($i) => '$' . $i, range(1, count($vals)));
        $sql = 'INSERT INTO translation_routing (' . implode(', ', $cols) . ') VALUES (' .
               implode(', ', $placeholders) . ') RETURNING *';
        $rows = $this->data->query($sql, $vals);
        return is_array($rows) && isset($rows[0]) ? $rows[0] : [];
    }

    public function deleteRoutingRule(int $routingId): bool
    {
        // Never delete the global_default — it's the safety net.
        $check = $this->data->query(
            'SELECT scope_type FROM translation_routing WHERE routing_id = $1',
            [$routingId]
        );
        if (!is_array($check) || count($check) === 0) {
            return false;
        }
        if (($check[0]['scope_type'] ?? '') === 'global_default') {
            return false;
        }
        $affected = $this->data->execute(
            'DELETE FROM translation_routing WHERE routing_id = $1',
            [$routingId]
        );
        return $affected > 0;
    }

    /**
     * @return array<string,mixed>|null
     */
    private function lookupRoutingRule(string $docCode, ?string $docType): ?array
    {
        $tier = $this->tierForDocType($docType);
        // Single SQL with a CASE-based ranking so the highest-precedence
        // rule wins. We materialise glob patterns via SIMILAR TO over the
        // doc_code (case-insensitive).
        $sql = 'SELECT *,
                       (CASE scope_type
                          WHEN \'doc_code\' THEN 4
                          WHEN \'doc_pattern\' THEN 3
                          WHEN \'tier\' THEN 2
                          WHEN \'global_default\' THEN 1
                          ELSE 0
                        END) AS scope_rank
                  FROM translation_routing
                 WHERE is_enabled = TRUE
                   AND (
                        (scope_type = \'doc_code\' AND upper(scope_value) = upper($1))
                     OR (scope_type = \'doc_pattern\' AND $1 ILIKE replace(scope_value, \'*\', \'%\'))
                     OR (scope_type = \'tier\' AND scope_value = $2)
                     OR (scope_type = \'global_default\' AND scope_value = \'*\')
                       )
              ORDER BY scope_rank DESC, priority DESC
                 LIMIT 1';
        $rows = $this->data->query($sql, [$docCode, $tier]);
        if (!is_array($rows) || count($rows) === 0) {
            return null;
        }
        return $rows[0];
    }

    /**
     * @param array<string, array<string,mixed>> $providersById
     * @param array<string,mixed>|string|null $optionsOverride
     */
    private function buildAttempt(array $providersById, string $providerKey, ?string $modelId, mixed $optionsOverride): ?ProviderAttempt
    {
        if ($providerKey === '' || !isset($providersById[$providerKey])) {
            return null;
        }
        $provider = $providersById[$providerKey];
        if (($provider['is_enabled'] ?? false) !== true) {
            return null;
        }
        $caps = $this->decodeJsonObject($provider['capabilities'] ?? '{}');
        $defaultOpts = $this->decodeJsonObject($provider['default_options'] ?? '{}');
        $override = is_string($optionsOverride)
            ? $this->decodeJsonObject($optionsOverride)
            : (is_array($optionsOverride) ? $optionsOverride : []);
        $merged = array_merge($defaultOpts, $override);

        $att = new ProviderAttempt();
        $att->providerKey = $providerKey;
        $att->modelId = $modelId;
        $att->driverCommand = (string)$provider['driver_command'];
        $att->providerKind = (string)$provider['provider_kind'];
        $att->options = $merged;
        $att->capabilities = $caps;
        $att->costClass = (string)($caps['cost_class'] ?? 'unknown');

        // Inject API key (for http_api kind) — only when actually about to spawn.
        // For cli_subscription, the env var DCC_PROVIDER_API_KEY stays empty
        // and the driver relies on HOME=cli_auth_home_path instead.
        if ($att->providerKind === 'http_api') {
            $att->apiKey = $this->vault->reveal($providerKey);
        } else {
            $att->apiKey = null;
        }

        // For cli_subscription, look up CLI binary + auth home so the env can
        // be set when proc_open runs.
        if ($att->providerKind === 'cli_subscription') {
            $row = $this->data->query(
                'SELECT cli_binary_path, cli_auth_home_path
                   FROM translation_credentials WHERE provider_key = $1',
                [$providerKey]
            );
            if (is_array($row) && isset($row[0])) {
                $att->cliBinaryPath = (string)($row[0]['cli_binary_path'] ?? '');
                $att->cliAuthHomePath = (string)($row[0]['cli_auth_home_path'] ?? '');
            }
        }

        return $att;
    }

    /**
     * @return array<string, array<string,mixed>>
     */
    private function loadProviderMap(): array
    {
        $rows = $this->data->query(
            'SELECT provider_key, display_name, provider_kind, driver_command,
                    capabilities, default_options, is_enabled
               FROM translation_provider_config'
        );
        $out = [];
        foreach ((array)$rows as $row) {
            if (!is_array($row)) { continue; }
            $out[(string)$row['provider_key']] = $row;
        }
        return $out;
    }

    private function decodeJsonObject(mixed $value): array
    {
        if (is_array($value)) { return $value; }
        if (!is_string($value) || $value === '') { return []; }
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function decodeJsonArray(mixed $value): array
    {
        $arr = $this->decodeJsonObject($value);
        return array_values($arr);
    }
}
