<?php

declare(strict_types=1);

namespace HESEM\QMS\Services;

/**
 * Governed MES -> Epicor outbound worker.
 *
 * Processes Epicor outbox events with retry / dead-letter semantics while
 * remaining safe in environments where transport is not configured yet.
 */
final class OutboxWorker
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
    public function processPending(array $options = []): array
    {
        $this->ensureApiHelpersLoaded();

        $limit = max(1, min(100, (int)($options['limit'] ?? 25)));
        $userId = trim((string)($options['user_id'] ?? 'scheduled_job')) ?: 'scheduled_job';
        $runtime = \load_epicor_runtime_store();
        $policy = \load_epicor_integration_policy();

        $retryPlan = array_values(array_map('intval', (array)($policy['outbound_targets']['retry_backoff_minutes'] ?? [1, 5, 15, 30, 60])));
        if ($retryPlan === []) {
            $retryPlan = [1, 5, 15, 30, 60];
        }
        $maxRetry = max(1, (int)($policy['outbound_targets']['max_retry_count'] ?? 5));
        $deadLetterAfter = max($maxRetry, (int)($policy['outbound_targets']['dead_letter_after_failures'] ?? $maxRetry));

        $runtime['outbox_events'] = array_values((array)($runtime['outbox_events'] ?? []));
        usort($runtime['outbox_events'], static fn($a, $b) => strcmp((string)($a['first_queued_at'] ?? ''), (string)($b['first_queued_at'] ?? '')));

        $processed = 0;
        $delivered = 0;
        $retried = 0;
        $deadLetter = 0;
        $skipped = 0;
        $results = [];
        $domainStats = [];

        foreach ($runtime['outbox_events'] as $idx => $row) {
            if (!is_array($row)) {
                continue;
            }
            $status = strtolower(trim((string)($row['publish_status'] ?? 'queued')));
            if (!in_array($status, ['queued', 'retry', 'failed'], true)) {
                continue;
            }
            if (!$this->isDue($row)) {
                $skipped++;
                continue;
            }
            if ($processed >= $limit) {
                break;
            }

            $processed++;
            $domain = strtolower(trim((string)($row['sync_domain'] ?? 'generic')));
            $attemptedAt = gmdate(DATE_ATOM);
            $transportResult = $this->dispatchEvent($row);
            $domainStats[$domain] = $domainStats[$domain] ?? ['processed' => 0, 'delivered' => 0, 'failed' => 0, 'skipped' => 0];
            $domainStats[$domain]['processed']++;

            if (($transportResult['skipped'] ?? false) === true) {
                $results[] = [
                    'outbox_event_id' => (string)($row['outbox_event_id'] ?? ''),
                    'sync_domain' => $domain,
                    'status' => 'skipped',
                    'message' => (string)($transportResult['message'] ?? 'Transport skipped.'),
                ];
                $domainStats[$domain]['skipped']++;
                $skipped++;
                continue;
            }

            $runtime['outbox_events'][$idx]['last_attempt_at'] = $attemptedAt;
            $runtime['outbox_events'][$idx]['updated_at'] = $attemptedAt;
            $runtime['outbox_events'][$idx]['updated_by'] = $userId;
            $runtime['outbox_events'][$idx]['erp_response'] = (array)($transportResult['response'] ?? []);

            if (($transportResult['ok'] ?? false) === true) {
                $runtime['outbox_events'][$idx]['publish_status'] = 'acked';
                $runtime['outbox_events'][$idx]['acked_at'] = $attemptedAt;
                $runtime['outbox_events'][$idx]['summary'] = 'Delivered to Epicor successfully.';
                $runtime['outbox_events'][$idx]['message_en'] = 'Epicor acknowledged the outbound transaction.';
                $runtime['outbox_events'][$idx]['message_vi'] = 'Epicor đã xác nhận giao dịch outbound.';
                $runtime['outbox_events'][$idx]['next_attempt_at'] = '';
                $delivered++;
                $domainStats[$domain]['delivered']++;
                $results[] = [
                    'outbox_event_id' => (string)($row['outbox_event_id'] ?? ''),
                    'sync_domain' => $domain,
                    'status' => 'acked',
                    'message' => (string)($transportResult['message'] ?? 'Delivered to Epicor successfully.'),
                ];
                continue;
            }

            $retryCount = max(0, (int)($runtime['outbox_events'][$idx]['retry_count'] ?? 0)) + 1;
            $runtime['outbox_events'][$idx]['retry_count'] = $retryCount;
            $runtime['outbox_events'][$idx]['acked_at'] = '';
            $runtime['outbox_events'][$idx]['summary'] = 'Epicor outbound delivery failed and requires retry.';
            $runtime['outbox_events'][$idx]['message_en'] = (string)($transportResult['message'] ?? 'Epicor outbound delivery failed.');
            $runtime['outbox_events'][$idx]['message_vi'] = 'Giao dịch outbound sang Epicor bị lỗi và cần thử lại.';

            if ($retryCount >= $deadLetterAfter) {
                $runtime['outbox_events'][$idx]['publish_status'] = 'dead_letter';
                $runtime['outbox_events'][$idx]['next_attempt_at'] = '';
                $deadLetter++;
                $domainStats[$domain]['failed']++;
                $results[] = [
                    'outbox_event_id' => (string)($row['outbox_event_id'] ?? ''),
                    'sync_domain' => $domain,
                    'status' => 'dead_letter',
                    'message' => (string)($transportResult['message'] ?? 'Moved to dead letter after repeated failures.'),
                ];
            } else {
                $runtime['outbox_events'][$idx]['publish_status'] = 'retry';
                $runtime['outbox_events'][$idx]['next_attempt_at'] = $this->nextAttemptAt($retryPlan, $retryCount);
                $retried++;
                $domainStats[$domain]['failed']++;
                $results[] = [
                    'outbox_event_id' => (string)($row['outbox_event_id'] ?? ''),
                    'sync_domain' => $domain,
                    'status' => 'retry',
                    'message' => (string)($transportResult['message'] ?? 'Scheduled for retry.'),
                ];
            }
        }

        $runtime['_meta']['updated'] = gmdate(DATE_ATOM);
        $runtime['health'] = is_array($runtime['health'] ?? null) ? $runtime['health'] : [];
        $runtime['health']['last_outbox_worker_at'] = gmdate(DATE_ATOM);
        $runtime['health']['last_outbox_worker_result'] = [
            'processed' => $processed,
            'delivered' => $delivered,
            'retried' => $retried,
            'dead_letter' => $deadLetter,
            'skipped' => $skipped,
        ];

        $runtime['sync_runs'] = array_values((array)($runtime['sync_runs'] ?? []));
        foreach ($domainStats as $domain => $stats) {
            $status = $stats['failed'] > 0
                ? ($stats['delivered'] > 0 ? 'partial' : 'failed')
                : ($stats['delivered'] > 0 ? 'success' : 'queued');
            $normalized = \epicor_integration_service()->normalizeSyncRun([
                'sync_domain' => $domain,
                'sync_direction' => 'outbound',
                'transport_mode' => 'rest',
                'sync_status' => $status,
                'started_at' => gmdate(DATE_ATOM),
                'completed_at' => gmdate(DATE_ATOM),
                'records_received' => 0,
                'records_processed' => (int)($stats['delivered'] ?? 0),
                'records_failed' => (int)($stats['failed'] ?? 0),
                'summary' => 'Epicor outbox worker cycle completed.',
                'summary_vi' => 'Chu kỳ Epicor outbox worker đã hoàn tất.',
                'summary_en' => 'Epicor outbox worker cycle completed.',
                'metadata' => [
                    'worker' => 'OutboxWorker',
                    'processed' => (int)($stats['processed'] ?? 0),
                    'delivered' => (int)($stats['delivered'] ?? 0),
                    'failed' => (int)($stats['failed'] ?? 0),
                    'skipped' => (int)($stats['skipped'] ?? 0),
                ],
            ], $userId, $policy);
            \upsert_epicor_runtime_item($runtime['sync_runs'], 'sync_run_id', $normalized);
        }

        \save_epicor_runtime_store($runtime);

        return [
            'ok' => $deadLetter === 0,
            'processed' => $processed,
            'delivered' => $delivered,
            'retried' => $retried,
            'dead_letter' => $deadLetter,
            'skipped' => $skipped,
            'results' => $results,
            'runtime' => $runtime,
        ];
    }

    /** @param array<string, mixed> $row
     *  @return array<string, mixed>
     */
    private function dispatchEvent(array $row): array
    {
        $payload = is_array($row['payload'] ?? null) ? $row['payload'] : [];
        return match (strtolower(trim((string)($row['sync_domain'] ?? '')))) {
            'labor' => $this->transport->pushLabor($payload),
            'material' => $this->transport->pushMaterial($payload),
            'completions' => $this->transport->pushCompletion($payload),
            'quality' => $this->transport->pushQualityResult($payload),
            default => [
                'ok' => false,
                'skipped' => true,
                'message' => 'No Epicor transport route is defined for this outbox domain.',
                'response' => [],
            ],
        };
    }

    /** @param array<string, mixed> $row */
    private function isDue(array $row): bool
    {
        $nextAttemptAt = trim((string)($row['next_attempt_at'] ?? ''));
        if ($nextAttemptAt === '') {
            return true;
        }
        try {
            return (new \DateTimeImmutable($nextAttemptAt)) <= new \DateTimeImmutable('now');
        } catch (\Throwable) {
            return true;
        }
    }

    /** @param array<int, int> $retryPlan */
    private function nextAttemptAt(array $retryPlan, int $retryCount): string
    {
        $index = max(0, min(count($retryPlan) - 1, $retryCount - 1));
        $minutes = max(1, (int)($retryPlan[$index] ?? 5));
        return gmdate(DATE_ATOM, time() + ($minutes * 60));
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
