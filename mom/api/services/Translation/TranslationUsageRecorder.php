<?php

declare(strict_types=1);

namespace MOM\Services\Translation;

use MOM\Database\DataLayer;
use Throwable;

/**
 * Append-only ledger writer + cost summary reader.
 *
 * Cost is stored as microcents (USD * 1e8) to avoid float drift over
 * thousands of rows. Pricing is read from
 * mom/data/config/translation-pricing.json (a tiny lookup table that admins
 * update by hand when API prices change). For cli_subscription providers
 * the cost is logged as 0 — the subscription is a flat fee.
 */
final class TranslationUsageRecorder
{
    public function __construct(
        private readonly DataLayer $data,
        private readonly string $rootDir,
    ) {}

    /**
     * @param array<string,mixed> $extra
     */
    public function record(
        ?string $docCode,
        string $providerKey,
        ?string $modelId,
        string $triggerKind,
        ?int $inputTokens,
        ?int $cachedInputTokens,
        ?int $outputTokens,
        int $durationMs,
        string $outcome,
        ?string $errorCode = null,
        ?string $fallbackFrom = null,
        array $extra = [],
    ): void {
        $cost = $this->computeCostMicrocents($providerKey, $modelId, $inputTokens, $cachedInputTokens, $outputTokens);
        try {
            $this->data->execute(
                'INSERT INTO translation_usage_log
                    (doc_code, provider_key, model_id, trigger_kind,
                     input_tokens, cached_input_tokens, output_tokens,
                     cost_usd_microcents, duration_ms, outcome, error_code, fallback_from, metadata)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)',
                [
                    $docCode, $providerKey, $modelId, $triggerKind,
                    $inputTokens, $cachedInputTokens, $outputTokens,
                    $cost, $durationMs, $outcome, $errorCode, $fallbackFrom,
                    json_encode($extra, JSON_UNESCAPED_SLASHES) ?: '{}',
                ]
            );
        } catch (Throwable $e) {
            // Never let logging failure break translation. Swallow + error_log.
            error_log('TranslationUsageRecorder.record failed: ' . $e->getMessage());
        }
    }

    /**
     * Aggregate spend + counts for the admin dashboard.
     *
     * @return array<string,mixed>
     */
    public function summarise(int $sinceDays = 30): array
    {
        $rows = $this->data->query(
            "SELECT provider_key,
                    COUNT(*)                              AS attempts,
                    SUM(CASE WHEN outcome = 'ok' THEN 1 ELSE 0 END) AS successes,
                    SUM(COALESCE(input_tokens,0))         AS input_tokens,
                    SUM(COALESCE(cached_input_tokens,0))  AS cached_tokens,
                    SUM(COALESCE(output_tokens,0))        AS output_tokens,
                    SUM(COALESCE(cost_usd_microcents,0))  AS cost_microcents,
                    AVG(duration_ms)                      AS avg_ms
               FROM translation_usage_log
              WHERE created_at >= now() - ((\$1)::int * INTERVAL '1 day')
              GROUP BY provider_key
              ORDER BY cost_microcents DESC, attempts DESC",
            [$sinceDays]
        );
        if (!is_array($rows)) {
            return ['since_days' => $sinceDays, 'providers' => [], 'total_cost_usd' => 0.0];
        }
        $totalMicrocents = 0;
        foreach ($rows as $row) {
            $totalMicrocents += (int)($row['cost_microcents'] ?? 0);
        }
        return [
            'since_days' => $sinceDays,
            'providers' => array_map(function (array $row): array {
                return [
                    'provider_key' => (string)$row['provider_key'],
                    'attempts' => (int)$row['attempts'],
                    'successes' => (int)$row['successes'],
                    'input_tokens' => (int)$row['input_tokens'],
                    'cached_tokens' => (int)$row['cached_tokens'],
                    'output_tokens' => (int)$row['output_tokens'],
                    'cost_usd' => round((int)$row['cost_microcents'] / 100_000_000, 4),
                    'avg_ms' => (int)round((float)($row['avg_ms'] ?? 0)),
                ];
            }, $rows),
            'total_cost_usd' => round($totalMicrocents / 100_000_000, 4),
        ];
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function recentAttempts(int $limit = 50): array
    {
        $limit = max(1, min(500, $limit));
        $rows = $this->data->query(
            'SELECT usage_id, doc_code, provider_key, model_id, trigger_kind,
                    input_tokens, output_tokens, cost_usd_microcents,
                    duration_ms, outcome, error_code, fallback_from, created_at
               FROM translation_usage_log
              ORDER BY created_at DESC
              LIMIT $1',
            [$limit]
        );
        if (!is_array($rows)) {
            return [];
        }
        return array_map(function (array $row): array {
            $row['cost_usd'] = round((int)($row['cost_usd_microcents'] ?? 0) / 100_000_000, 6);
            unset($row['cost_usd_microcents']);
            return $row;
        }, $rows);
    }

    private function computeCostMicrocents(
        string $providerKey,
        ?string $modelId,
        ?int $inputTokens,
        ?int $cachedInputTokens,
        ?int $outputTokens,
    ): int {
        $pricing = $this->loadPricing();
        $entry = $pricing[$providerKey][$modelId ?? '__default__'] ?? $pricing[$providerKey]['__default__'] ?? null;
        if (!is_array($entry)) {
            return 0;
        }
        $inputUsdPerMillion = (float)($entry['input_usd_per_million'] ?? 0);
        $cachedUsdPerMillion = (float)($entry['cached_input_usd_per_million'] ?? 0);
        $outputUsdPerMillion = (float)($entry['output_usd_per_million'] ?? 0);

        $usd = (($inputTokens ?? 0) - ($cachedInputTokens ?? 0)) / 1_000_000 * $inputUsdPerMillion
             + ($cachedInputTokens ?? 0) / 1_000_000 * $cachedUsdPerMillion
             + ($outputTokens ?? 0) / 1_000_000 * $outputUsdPerMillion;

        return (int)round($usd * 100_000_000);
    }

    /**
     * @return array<string, array<string, array<string, float>>>
     */
    private function loadPricing(): array
    {
        static $cache = null;
        if ($cache !== null) {
            return $cache;
        }
        $path = rtrim($this->rootDir, '/') . '/mom/data/config/translation-pricing.json';
        if (!is_file($path)) {
            $cache = [];
            return $cache;
        }
        $raw = @file_get_contents($path);
        if (!is_string($raw)) {
            $cache = [];
            return $cache;
        }
        $decoded = json_decode($raw, true);
        $cache = is_array($decoded) ? $decoded : [];
        return $cache;
    }
}
