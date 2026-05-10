<?php

declare(strict_types=1);

namespace MOM\Services\Translation;

use MOM\Database\DataLayer;

/**
 * Discovers which models a provider actually exposes for the current account.
 *
 * Strategy depends on provider_kind:
 *   - local_model:      filesystem scan (return only models present on disk).
 *   - cli_subscription: probe each candidate (from capabilities.candidate_models)
 *                       by sending a minimal prompt; treat success as "available".
 *   - http_api:         GET /v1/models with the stored API key.
 *
 * Results cached in translation_credentials.available_models with a
 * timestamp; refreshable on demand via a UI button.
 *
 * NOTE: kept simple by design — when Anthropic/OpenAI ship a new model,
 * the candidate list is updated via a migration (rare, manageable).
 */
final class ModelDiscoveryService
{
    private const CACHE_TTL_SECONDS = 86400; // 1 day

    public function __construct(
        private readonly DataLayer $data,
        private readonly SecretVaultService $vault,
    ) {}

    /**
     * Return cached models if fresh, otherwise refresh first.
     *
     * @return array<int, array<string,string>>
     */
    public function listAvailable(string $providerKey, bool $force = false): array
    {
        if (!$force) {
            $cached = $this->loadCached($providerKey);
            if ($cached !== null) {
                return $cached;
            }
        }
        return $this->refresh($providerKey);
    }

    /**
     * @return array<int, array<string,string>>
     */
    public function refresh(string $providerKey): array
    {
        $providerRow = $this->data->query(
            'SELECT provider_kind, capabilities FROM translation_provider_config WHERE provider_key = :p1',
            [':p1' => $providerKey]
        );
        if (!is_array($providerRow) || count($providerRow) === 0) {
            return [];
        }
        $kind = (string)$providerRow[0]['provider_kind'];
        $caps = $this->decodeJson($providerRow[0]['capabilities'] ?? '{}');
        $candidates = is_array($caps['candidate_models'] ?? null) ? $caps['candidate_models'] : [];

        $models = match ($kind) {
            'local_model'      => $this->scanLocalModels($providerKey, $candidates),
            'cli_subscription' => $this->probeCliModels($providerKey, $candidates),
            'http_api'         => $this->fetchHttpModels($providerKey, $candidates),
            default            => [],
        };

        $this->cache($providerKey, $models);
        return $models;
    }

    /**
     * @return array<int, array<string,string>>|null
     */
    private function loadCached(string $providerKey): ?array
    {
        $rows = $this->data->query(
            'SELECT available_models, models_fetched_at
               FROM translation_credentials
              WHERE provider_key = :p1',
            [':p1' => $providerKey]
        );
        if (!is_array($rows) || count($rows) === 0) {
            return null;
        }
        $row = $rows[0];
        $fetchedRaw = (string)($row['models_fetched_at'] ?? '');
        if ($fetchedRaw === '') {
            return null;
        }
        $fetchedTs = strtotime($fetchedRaw);
        if ($fetchedTs === false || (time() - $fetchedTs) > self::CACHE_TTL_SECONDS) {
            return null;
        }
        $decoded = $this->decodeJson($row['available_models'] ?? '[]');
        return is_array($decoded) ? array_values($decoded) : null;
    }

    private function cache(string $providerKey, array $models): void
    {
        $payload = json_encode(array_values($models), JSON_UNESCAPED_SLASHES) ?: '[]';
        $exists = $this->data->query(
            'SELECT 1 FROM translation_credentials WHERE provider_key = :p1',
            [':p1' => $providerKey]
        );
        if (is_array($exists) && count($exists) > 0) {
            $this->data->execute(
                'UPDATE translation_credentials
                    SET available_models = :p1::jsonb,
                        models_fetched_at = now(),
                        updated_at = now()
                  WHERE provider_key = :p2',
                [':p1' => $payload, ':p2' => $providerKey]
            );
        } else {
            $this->data->execute(
                'INSERT INTO translation_credentials (provider_key, credential_kind, available_models, models_fetched_at)
                 VALUES (:p1, :p2, :p3::jsonb, now())',
                [':p1' => $providerKey, ':p2' => 'none', ':p3' => $payload]
            );
        }
    }

    /**
     * @param array<int,mixed> $candidates
     * @return array<int, array<string,string>>
     */
    private function scanLocalModels(string $providerKey, array $candidates): array
    {
        // For NLLB the model dir is /var/www/data-private/translation-models/<id>-ct2-int8|fp16
        $base = (string)(getenv('DCC_TRANSLATION_MODELS_DIR') ?: '/var/www/data-private/translation-models');
        $out = [];
        foreach ($candidates as $cand) {
            if (!is_array($cand)) { continue; }
            $id = (string)($cand['id'] ?? '');
            $label = (string)($cand['label'] ?? $id);
            if ($id === '') { continue; }
            // Look for any directory whose name contains $id
            $present = false;
            if (is_dir($base)) {
                foreach (scandir($base) ?: [] as $entry) {
                    if ($entry === '.' || $entry === '..') { continue; }
                    if (str_contains($entry, $id)) {
                        $present = true;
                        break;
                    }
                }
            }
            if ($present) {
                $out[] = ['id' => $id, 'label' => $label, 'state' => 'available'];
            } else {
                $out[] = ['id' => $id, 'label' => $label, 'state' => 'not_installed'];
            }
        }
        return $out;
    }

    /**
     * @param array<int,mixed> $candidates
     * @return array<int, array<string,string>>
     */
    private function probeCliModels(string $providerKey, array $candidates): array
    {
        // We don't actually run N probes (would burn rate limit). Instead
        // we surface the candidate list verbatim and rely on the user-driven
        // "Test" button to validate one. The cli runtime probe (CliRuntimeService)
        // already proves the binary + auth work.
        $out = [];
        foreach ($candidates as $cand) {
            if (!is_array($cand)) { continue; }
            $id = (string)($cand['id'] ?? '');
            if ($id === '') { continue; }
            $out[] = [
                'id' => $id,
                'label' => (string)($cand['label'] ?? $id),
                'state' => 'candidate',
            ];
        }
        return $out;
    }

    /**
     * @param array<int,mixed> $fallbackCandidates
     * @return array<int, array<string,string>>
     */
    private function fetchHttpModels(string $providerKey, array $fallbackCandidates): array
    {
        $apiKey = $this->vault->reveal($providerKey);
        if ($apiKey === null) {
            return $this->candidatesAsList($fallbackCandidates);
        }
        $endpoint = match (true) {
            str_starts_with($providerKey, 'anthropic') => 'https://api.anthropic.com/v1/models',
            str_starts_with($providerKey, 'openai')    => 'https://api.openai.com/v1/models',
            default => null,
        };
        if ($endpoint === null) {
            return $this->candidatesAsList($fallbackCandidates);
        }
        $headers = str_starts_with($providerKey, 'anthropic')
            ? ['x-api-key: ' . $apiKey, 'anthropic-version: 2023-06-01']
            : ['Authorization: Bearer ' . $apiKey];
        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 8,
        ]);
        $body = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        unset($ch); /* PHP 8.5: curl_close deprecated */
        if ($code !== 200 || !is_string($body)) {
            return $this->candidatesAsList($fallbackCandidates);
        }
        $decoded = json_decode($body, true);
        $items = $decoded['data'] ?? [];
        if (!is_array($items)) {
            return $this->candidatesAsList($fallbackCandidates);
        }
        $out = [];
        foreach ($items as $item) {
            if (!is_array($item)) { continue; }
            $id = (string)($item['id'] ?? '');
            if ($id === '') { continue; }
            $label = (string)($item['display_name'] ?? $id);
            $out[] = ['id' => $id, 'label' => $label, 'state' => 'available'];
        }
        return $out;
    }

    /**
     * @param array<int,mixed> $candidates
     * @return array<int, array<string,string>>
     */
    private function candidatesAsList(array $candidates): array
    {
        $out = [];
        foreach ($candidates as $cand) {
            if (!is_array($cand)) { continue; }
            $id = (string)($cand['id'] ?? '');
            if ($id === '') { continue; }
            $out[] = ['id' => $id, 'label' => (string)($cand['label'] ?? $id), 'state' => 'candidate'];
        }
        return $out;
    }

    private function decodeJson(mixed $value): array
    {
        if (is_array($value)) { return $value; }
        if (!is_string($value) || $value === '') { return []; }
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }
}
