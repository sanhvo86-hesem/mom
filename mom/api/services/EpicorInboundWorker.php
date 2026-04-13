<?php

declare(strict_types=1);

namespace MOM\Services;

/**
 * Governed Epicor -> MES inbound pull worker.
 *
 * This worker is intentionally conservative: it records inbound sync health,
 * checkpoints, and response metadata without forcing speculative writes into
 * order/master runtime stores when the remote payload shape is unknown.
 */
final class EpicorInboundWorker
{
    private readonly string $dataDir;
    private readonly EpicorTransportAdapter $transport;

    public function __construct(string $dataDir, ?EpicorTransportAdapter $transport = null)
    {
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->transport = $transport ?? new EpicorTransportAdapter($this->dataDir);
    }

    /** @param array<string, mixed> $options
     *  @return array<string, mixed>
     */
    public function processInbound(array $options = []): array
    {
        $this->ensureApiHelpersLoaded();

        $policy = \load_epicor_integration_policy();
        $runtime = \load_epicor_runtime_store();
        $userId = trim((string)($options['user_id'] ?? 'scheduled_job')) ?: 'scheduled_job';

        $requestedDomains = array_values(array_filter(array_map(
            static fn($value) => strtolower(trim((string)$value)),
            is_array($options['domains'] ?? null) ? $options['domains'] : []
        )));
        $domains = $this->resolveDomains($policy, $requestedDomains);

        $runtime['sync_runs'] = array_values((array)($runtime['sync_runs'] ?? []));
        $runtime['checkpoints'] = array_values((array)($runtime['checkpoints'] ?? []));
        $runtime['health'] = is_array($runtime['health'] ?? null) ? $runtime['health'] : [];

        $processed = 0;
        $succeeded = 0;
        $skipped = 0;
        $failed = 0;
        $results = [];

        foreach ($domains as $domain) {
            $processed++;
            $checkpointKey = $domain . '_checkpoint';
            $checkpointValue = $this->lookupCheckpoint($runtime, $checkpointKey);
            $startedAt = gmdate(DATE_ATOM);
            $transportResult = $this->pullDomain($domain, $checkpointValue);
            $completedAt = gmdate(DATE_ATOM);

            $recordsReceived = $this->estimateRecordCount($transportResult['response'] ?? []);
            $status = ($transportResult['ok'] ?? false) === true
                ? 'success'
                : (($transportResult['skipped'] ?? false) === true ? 'skipped' : 'failed');

            if ($status === 'success') {
                $succeeded++;
            } elseif ($status === 'skipped') {
                $skipped++;
            } else {
                $failed++;
            }

            $savedRun = null;
            try {
                $syncRun = \epicor_integration_service()->normalizeSyncRun([
                    'sync_domain' => $domain,
                    'sync_direction' => 'inbound',
                    'transport_mode' => 'rest',
                    'sync_status' => $status,
                    'started_at' => $startedAt,
                    'completed_at' => $completedAt,
                    'records_received' => $recordsReceived,
                    'records_processed' => $status === 'success' ? $recordsReceived : 0,
                    'records_failed' => $status === 'failed' ? 1 : 0,
                    'checkpoint_key' => $checkpointKey,
                    'checkpoint_value' => $status === 'success' ? $completedAt : $checkpointValue,
                    'summary' => $this->summaryEn($domain, $status, $recordsReceived),
                    'summary_vi' => $this->summaryVi($domain, $status, $recordsReceived),
                    'summary_en' => $this->summaryEn($domain, $status, $recordsReceived),
                    'metadata' => [
                        'worker' => 'EpicorInboundWorker',
                        'status_code' => (int)($transportResult['status_code'] ?? 0),
                        'message' => (string)($transportResult['message'] ?? ''),
                        'degraded' => $status === 'skipped',
                        'degradation_reason' => $status === 'skipped'
                            ? (string)($transportResult['error'] ?? 'unsupported_inbound_domain')
                            : '',
                        'response_shape' => $this->describeResponseShape($transportResult['response'] ?? []),
                        'checkpoint_before' => $checkpointValue,
                        'dry_run' => (bool)($transportResult['skipped'] ?? false),
                    ],
                ], $userId, $policy);
                $savedRun = \upsert_epicor_runtime_item($runtime['sync_runs'], 'sync_run_id', $syncRun);
            } catch (\RuntimeException $e) {
                if ($e->getMessage() !== 'invalid_epicor_sync_domain') {
                    throw $e;
                }
                $runtime['health']['unsupported_inbound_domains'] = array_values(array_unique(array_merge(
                    (array)($runtime['health']['unsupported_inbound_domains'] ?? []),
                    [$domain],
                )));
            }
            if ($status === 'success') {
                \upsert_epicor_runtime_item($runtime['checkpoints'], 'checkpoint_key', [
                    'checkpoint_key' => $checkpointKey,
                    'checkpoint_value' => (string)($savedRun['checkpoint_value'] ?? $completedAt),
                    'updated_at' => $completedAt,
                    'sync_run_id' => (string)($savedRun['sync_run_id'] ?? ''),
                    'sync_domain' => $domain,
                ]);
            }

            $results[] = [
                'sync_domain' => $domain,
                'status' => $status,
                'records_received' => $recordsReceived,
                'checkpoint_before' => $checkpointValue,
                'checkpoint_after' => $status === 'success' ? $completedAt : $checkpointValue,
                'message' => (string)($transportResult['message'] ?? ''),
                'status_code' => (int)($transportResult['status_code'] ?? 0),
            ];
        }

        $runtime['_meta']['updated'] = gmdate(DATE_ATOM);
        $runtime['health']['last_inbound_worker_at'] = gmdate(DATE_ATOM);
        $runtime['health']['last_inbound_worker_result'] = [
            'processed' => $processed,
            'succeeded' => $succeeded,
            'skipped' => $skipped,
            'failed' => $failed,
            'degraded' => $skipped > 0,
        ];

        \save_epicor_runtime_store($runtime);

        return [
            'ok' => $failed === 0 && $skipped === 0,
            'processed' => $processed,
            'succeeded' => $succeeded,
            'skipped' => $skipped,
            'failed' => $failed,
            'results' => $results,
            'runtime' => $runtime,
        ];
    }

    /** @param array<string, mixed> $policy
     *  @param array<int, string> $requestedDomains
     *  @return array<int, string>
     */
    private function resolveDomains(array $policy, array $requestedDomains): array
    {
        $available = [];
        foreach ((array)($policy['domains'] ?? []) as $domain => $config) {
            if (!is_array($config)) {
                continue;
            }
            $direction = strtolower(trim((string)($config['direction'] ?? 'inbound')));
            if (!in_array($direction, ['inbound', 'bidirectional'], true)) {
                continue;
            }
            $available[] = strtolower((string)$domain);
        }
        if ($requestedDomains === []) {
            return array_values(array_unique($available));
        }
        return array_values(array_unique($requestedDomains));
    }

    /** @param array<string, mixed> $runtime */
    private function lookupCheckpoint(array $runtime, string $checkpointKey): string
    {
        foreach ((array)($runtime['checkpoints'] ?? []) as $row) {
            if (!is_array($row)) {
                continue;
            }
            if ((string)($row['checkpoint_key'] ?? '') !== $checkpointKey) {
                continue;
            }
            return trim((string)($row['checkpoint_value'] ?? ''));
        }
        return '';
    }

    /** @return array<string, mixed> */
    private function pullDomain(string $domain, string $checkpoint): array
    {
        return match ($domain) {
            'sales_orders' => $this->transport->pullSalesOrders($checkpoint),
            'job_orders' => $this->transport->pullJobOrders($checkpoint),
            'work_orders' => $this->transport->pullWorkOrders($checkpoint),
            'master_data' => $this->transport->pullMasterData($domain, $checkpoint),
            default => [
                'ok' => false,
                'skipped' => true,
                'error' => 'unsupported_inbound_domain',
                'status_code' => 0,
                'message' => 'No inbound transport route is defined for this Epicor domain.',
                'response' => [],
            ],
        };
    }

    /** @param mixed $response */
    private function estimateRecordCount($response): int
    {
        if (!is_array($response)) {
            return 0;
        }
        foreach (['value', 'items', 'records', 'rows'] as $key) {
            if (is_array($response[$key] ?? null)) {
                return count((array)$response[$key]);
            }
        }
        return $response === [] ? 0 : 1;
    }

    /** @param mixed $response
     *  @return array<string, mixed>
     */
    private function describeResponseShape($response): array
    {
        if (!is_array($response)) {
            return ['kind' => gettype($response)];
        }
        $keys = array_slice(array_values(array_map('strval', array_keys($response))), 0, 8);
        $counts = [];
        foreach (['value', 'items', 'records', 'rows'] as $key) {
            if (is_array($response[$key] ?? null)) {
                $counts[$key] = count((array)$response[$key]);
            }
        }
        return [
            'kind' => 'array',
            'keys' => $keys,
            'count_hints' => $counts,
        ];
    }

    private function summaryVi(string $domain, string $status, int $recordsReceived): string
    {
        $label = match ($domain) {
            'sales_orders' => 'đơn hàng bán',
            'job_orders' => 'lệnh công việc',
            'work_orders' => 'work order',
            'master_data' => 'dữ liệu nền',
            default => $domain,
        };
        return match ($status) {
            'success' => 'Đã kéo ' . $recordsReceived . ' bản ghi ' . $label . ' từ Epicor.',
            'skipped' => 'Bỏ qua kéo ' . $label . ' vì transport Epicor chưa được cấu hình.',
            default => 'Kéo ' . $label . ' từ Epicor bị lỗi và cần xem lại transport.',
        };
    }

    private function summaryEn(string $domain, string $status, int $recordsReceived): string
    {
        return match ($status) {
            'success' => 'Pulled ' . $recordsReceived . ' ' . $domain . ' records from Epicor.',
            'skipped' => 'Skipped pulling ' . $domain . ' because the Epicor transport is not configured.',
            default => 'Pulling ' . $domain . ' from Epicor failed and needs transport review.',
        };
    }

    private function ensureApiHelpersLoaded(): void
    {
        if (\function_exists('load_epicor_runtime_store') && \function_exists('save_epicor_runtime_store')) {
            return;
        }
        if (!\defined('API_HELPERS_ONLY')) {
            \define('API_HELPERS_ONLY', true);
        }
        require_once dirname(__DIR__, 2) . '/api.php';
    }
}
