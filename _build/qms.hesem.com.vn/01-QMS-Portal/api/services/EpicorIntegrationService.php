<?php

declare(strict_types=1);

namespace MOM\Services;

use RuntimeException;

/**
 * Governance helpers for Epicor Kinetic <-> MES integration runtime.
 */
final class EpicorIntegrationService
{
    public function normalizeStore(array $store): array
    {
        $defaults = [
            '_meta' => [
                'version' => '1.0',
                'updated' => date(DATE_ATOM),
                'description' => 'Governed Epicor integration runtime for inbound sync, outbound outbox, and reconciliation exceptions.',
            ],
            'sync_runs' => [],
            'reconciliation_exceptions' => [],
            'outbox_events' => [],
            'checkpoints' => [],
            'health' => [],
        ];

        $store['_meta'] = is_array($store['_meta'] ?? null) ? array_merge($defaults['_meta'], $store['_meta']) : $defaults['_meta'];
        foreach (['sync_runs', 'reconciliation_exceptions', 'outbox_events'] as $key) {
            $store[$key] = array_values(is_array($store[$key] ?? null) ? $store[$key] : []);
        }
        $store['checkpoints'] = is_array($store['checkpoints'] ?? null) ? $store['checkpoints'] : [];
        $store['health'] = is_array($store['health'] ?? null) ? $store['health'] : [];

        return array_merge($defaults, $store);
    }

    public function normalizeSyncRun(array $payload, string $userId, array $policy = []): array
    {
        $domain = $this->normalizeDomain((string)($payload['sync_domain'] ?? $payload['domain'] ?? 'master_data'), $policy);
        $direction = $this->normalizeDirection((string)($payload['sync_direction'] ?? $payload['direction'] ?? 'inbound'));
        $status = $this->normalizeStatus((string)($payload['sync_status'] ?? $payload['status'] ?? 'queued'));
        $startedAt = $this->normalizeTimestamp((string)($payload['started_at'] ?? $payload['run_started_at'] ?? ''));
        $completedAt = $this->normalizeTimestamp((string)($payload['completed_at'] ?? $payload['finished_at'] ?? ''));
        $latency = (int)($payload['latency_ms'] ?? 0);

        if ($latency <= 0 && $startedAt !== '' && $completedAt !== '') {
            try {
                $start = new \DateTimeImmutable($startedAt);
                $finish = new \DateTimeImmutable($completedAt);
                $latency = max(0, (int)(($finish->getTimestamp() - $start->getTimestamp()) * 1000));
            } catch (\Throwable) {
                $latency = 0;
            }
        }

        return [
            'sync_run_id' => trim((string)($payload['sync_run_id'] ?? ('EPI-SYNC-' . date('YmdHis') . '-' . substr(md5($domain . $direction . microtime(true)), 0, 6)))),
            'integration_system' => trim((string)($payload['integration_system'] ?? 'Epicor Kinetic')),
            'sync_domain' => $domain,
            'sync_direction' => $direction,
            'transport_mode' => strtolower(trim((string)($payload['transport_mode'] ?? 'rest'))),
            'sync_status' => $status,
            'started_at' => $startedAt !== '' ? $startedAt : date(DATE_ATOM),
            'completed_at' => $completedAt,
            'latency_ms' => $latency,
            'records_received' => max(0, (int)($payload['records_received'] ?? 0)),
            'records_processed' => max(0, (int)($payload['records_processed'] ?? 0)),
            'records_failed' => max(0, (int)($payload['records_failed'] ?? 0)),
            'checkpoint_key' => trim((string)($payload['checkpoint_key'] ?? '')),
            'checkpoint_value' => trim((string)($payload['checkpoint_value'] ?? '')),
            'summary' => trim((string)($payload['summary'] ?? $payload['message'] ?? '')),
            'summary_vi' => trim((string)($payload['summary_vi'] ?? '')),
            'summary_en' => trim((string)($payload['summary_en'] ?? '')),
            'metadata' => is_array($payload['metadata'] ?? null) ? $payload['metadata'] : [],
            'updated_at' => date(DATE_ATOM),
            'updated_by' => $userId,
        ];
    }

    public function normalizeReconciliationException(array $payload, string $userId, array $policy = []): array
    {
        $domain = $this->normalizeDomain((string)($payload['sync_domain'] ?? $payload['domain'] ?? 'work_orders'), $policy);
        $severity = $this->normalizeSeverity((string)($payload['severity'] ?? 'warning'));
        $status = $this->normalizeExceptionStatus((string)($payload['exception_status'] ?? $payload['status'] ?? 'open'));

        $entityType = trim((string)($payload['entity_type'] ?? 'work_order'));
        $entityId = trim((string)($payload['entity_id'] ?? ''));
        if ($entityId === '') {
            throw new RuntimeException('missing_epicor_entity_id');
        }

        return [
            'reconciliation_id' => trim((string)($payload['reconciliation_id'] ?? ('EPI-REC-' . date('YmdHis') . '-' . substr(md5($domain . $entityId . microtime(true)), 0, 6)))),
            'sync_domain' => $domain,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'discrepancy_type' => strtolower(trim((string)($payload['discrepancy_type'] ?? 'data_mismatch'))),
            'severity' => $severity,
            'expected_value' => is_array($payload['expected_value'] ?? null) ? $payload['expected_value'] : ['value' => (string)($payload['expected_value'] ?? '')],
            'actual_value' => is_array($payload['actual_value'] ?? null) ? $payload['actual_value'] : ['value' => (string)($payload['actual_value'] ?? '')],
            'difference_summary' => trim((string)($payload['difference_summary'] ?? '')),
            'owner_role' => trim((string)($payload['owner_role'] ?? 'epicor_admin')),
            'exception_status' => $status,
            'detected_at' => $this->normalizeTimestamp((string)($payload['detected_at'] ?? '')) ?: date(DATE_ATOM),
            'resolved_at' => $this->normalizeTimestamp((string)($payload['resolved_at'] ?? '')),
            'message_vi' => trim((string)($payload['message_vi'] ?? '')),
            'message_en' => trim((string)($payload['message_en'] ?? '')),
            'metadata' => is_array($payload['metadata'] ?? null) ? $payload['metadata'] : [],
            'updated_at' => date(DATE_ATOM),
            'updated_by' => $userId,
        ];
    }

    public function normalizeOutboxEvent(array $payload, string $userId, array $policy = []): array
    {
        $domain = $this->normalizeDomain((string)($payload['sync_domain'] ?? $payload['domain'] ?? 'labor'), $policy);
        $status = $this->normalizeOutboxStatus((string)($payload['publish_status'] ?? $payload['status'] ?? 'queued'));
        $entityType = trim((string)($payload['entity_type'] ?? 'transaction'));
        $entityId = trim((string)($payload['entity_id'] ?? ''));
        if ($entityId === '') {
            throw new RuntimeException('missing_epicor_outbox_entity_id');
        }

        return [
            'outbox_event_id' => trim((string)($payload['outbox_event_id'] ?? ('EPI-OUT-' . date('YmdHis') . '-' . substr(md5($domain . $entityId . microtime(true)), 0, 6)))),
            'sync_domain' => $domain,
            'event_type' => strtolower(trim((string)($payload['event_type'] ?? 'mes_transaction'))),
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'transaction_type' => strtolower(trim((string)($payload['transaction_type'] ?? $payload['event_type'] ?? 'generic'))),
            'publish_status' => $status,
            'first_queued_at' => $this->normalizeTimestamp((string)($payload['first_queued_at'] ?? '')) ?: date(DATE_ATOM),
            'last_attempt_at' => $this->normalizeTimestamp((string)($payload['last_attempt_at'] ?? '')),
            'acked_at' => $this->normalizeTimestamp((string)($payload['acked_at'] ?? '')),
            'retry_count' => max(0, (int)($payload['retry_count'] ?? 0)),
            'summary' => trim((string)($payload['summary'] ?? '')),
            'message_vi' => trim((string)($payload['message_vi'] ?? '')),
            'message_en' => trim((string)($payload['message_en'] ?? '')),
            'payload' => is_array($payload['payload'] ?? null) ? $payload['payload'] : [],
            'erp_response' => is_array($payload['erp_response'] ?? null) ? $payload['erp_response'] : [],
            'updated_at' => date(DATE_ATOM),
            'updated_by' => $userId,
        ];
    }

    public function buildSnapshot(array $store, array $orders, array $master, array $mes, array $policy = []): array
    {
        $store = $this->normalizeStore($store);
        $domains = is_array($policy['domains'] ?? null) ? $policy['domains'] : [];
        $syncRuns = array_values(array_filter((array)$store['sync_runs'], 'is_array'));
        $reconciliation = array_values(array_filter((array)$store['reconciliation_exceptions'], 'is_array'));
        $outbox = array_values(array_filter((array)$store['outbox_events'], 'is_array'));

        $latestRunByDomain = [];
        foreach ($syncRuns as $row) {
            $domain = strtolower(trim((string)($row['sync_domain'] ?? '')));
            if ($domain === '') {
                continue;
            }
            $latest = $latestRunByDomain[$domain] ?? null;
            if ($latest === null || strcmp((string)($row['started_at'] ?? ''), (string)($latest['started_at'] ?? '')) > 0) {
                $latestRunByDomain[$domain] = $row;
            }
        }

        $now = new \DateTimeImmutable('now', new \DateTimeZone('Asia/Ho_Chi_Minh'));
        $domainRows = [];
        $degraded = 0;
        $reconciliationOpen = 0;
        $outboxPending = 0;
        $latencies = [];
        $lastSuccess = '';

        foreach ($domains as $domainKey => $domainConfig) {
            if (!is_array($domainConfig)) {
                continue;
            }
            $run = is_array($latestRunByDomain[$domainKey] ?? null) ? $latestRunByDomain[$domainKey] : [];
            $openRecon = array_values(array_filter($reconciliation, fn($row) => is_array($row) && strtolower(trim((string)($row['sync_domain'] ?? ''))) === $domainKey && !in_array(strtolower(trim((string)($row['exception_status'] ?? 'open'))), ['resolved', 'ignored', 'closed'], true)));
            $pendingOutbox = array_values(array_filter($outbox, fn($row) => is_array($row) && strtolower(trim((string)($row['sync_domain'] ?? ''))) === $domainKey && in_array(strtolower(trim((string)($row['publish_status'] ?? 'queued'))), ['queued', 'retry', 'failed'], true)));

            $status = 'warning';
            $summaryVi = 'Chưa có chu kỳ đồng bộ gần đây.';
            $summaryEn = 'No recent synchronization run is available.';

            $runStatus = strtolower(trim((string)($run['sync_status'] ?? '')));
            $completedAt = (string)($run['completed_at'] ?? $run['started_at'] ?? '');
            $staleMinutes = max(5, (int)($domainConfig['stale_after_minutes'] ?? (($domainConfig['poll_interval_minutes'] ?? 15) * 3)));
            $ageMinutes = $this->ageMinutes($completedAt, $now);

            if ($run !== []) {
                if (isset($run['latency_ms']) && (int)$run['latency_ms'] > 0) {
                    $latencies[] = (int)$run['latency_ms'];
                }
                if ($runStatus === 'success' && $completedAt !== '') {
                    $lastSuccess = max($lastSuccess, $completedAt);
                }
            }

            if ($run === []) {
                $status = 'critical';
            } elseif (in_array($runStatus, ['failed', 'error'], true)) {
                $status = 'critical';
                $summaryVi = 'Lần đồng bộ gần nhất đã thất bại.';
                $summaryEn = 'The latest synchronization run failed.';
            } elseif (in_array($runStatus, ['running', 'queued'], true)) {
                $status = 'warning';
                $summaryVi = 'Chu kỳ đồng bộ đang chờ hoàn tất.';
                $summaryEn = 'The synchronization cycle is still in progress or queued.';
            } elseif ($ageMinutes !== null && $ageMinutes > $staleMinutes) {
                $status = 'warning';
                $summaryVi = 'Đồng bộ thành công nhưng checkpoint đã cũ hơn ngưỡng cho phép.';
                $summaryEn = 'Synchronization succeeded, but the checkpoint is older than the governed threshold.';
            } elseif (!empty($openRecon) || !empty($pendingOutbox)) {
                $status = 'warning';
                $summaryVi = 'Đồng bộ đã chạy nhưng vẫn còn sai lệch hoặc giao dịch chờ đẩy lên ERP.';
                $summaryEn = 'Synchronization completed, but reconciliation gaps or queued ERP transactions remain.';
            } else {
                $status = 'ready';
                $summaryVi = 'Miền dữ liệu đang đồng bộ ổn định.';
                $summaryEn = 'The domain is synchronizing within governed thresholds.';
            }

            if ($status !== 'ready') {
                $degraded++;
            }
            $reconciliationOpen += count($openRecon);
            $outboxPending += count($pendingOutbox);

            $domainRows[] = [
                'sync_domain' => $domainKey,
                'label_vi' => (string)($domainConfig['label_vi'] ?? $domainKey),
                'label_en' => (string)($domainConfig['label_en'] ?? $domainKey),
                'direction' => (string)($domainConfig['direction'] ?? 'bidirectional'),
                'poll_interval_minutes' => (int)($domainConfig['poll_interval_minutes'] ?? 15),
                'stale_after_minutes' => $staleMinutes,
                'status' => $status,
                'last_run' => $run,
                'age_minutes' => $ageMinutes,
                'reconciliation_open' => count($openRecon),
                'outbox_pending' => count($pendingOutbox),
                'summary_vi' => $summaryVi,
                'summary_en' => $summaryEn,
            ];
        }

        usort($syncRuns, static fn($a, $b) => strcmp((string)($b['started_at'] ?? ''), (string)($a['started_at'] ?? '')));
        usort($reconciliation, static fn($a, $b) => strcmp((string)($b['detected_at'] ?? ''), (string)($a['detected_at'] ?? '')));
        usort($outbox, static fn($a, $b) => strcmp((string)($b['first_queued_at'] ?? ''), (string)($a['first_queued_at'] ?? '')));

        $exceptionQueue = [];
        foreach ($domainRows as $row) {
            if (($row['status'] ?? 'ready') === 'ready') {
                continue;
            }
            $exceptionQueue[] = [
                'exception_id' => 'EPI-DOMAIN-' . strtoupper((string)$row['sync_domain']),
                'sync_domain' => (string)$row['sync_domain'],
                'severity' => (string)$row['status'],
                'type' => 'domain_health',
                'message_vi' => (string)$row['summary_vi'],
                'message_en' => (string)$row['summary_en'],
                'detail' => [
                    'age_minutes' => $row['age_minutes'],
                    'reconciliation_open' => $row['reconciliation_open'],
                    'outbox_pending' => $row['outbox_pending'],
                ],
                'owner_role' => 'epicor_admin',
                'updated_at' => (string)($row['last_run']['completed_at'] ?? $row['last_run']['started_at'] ?? ''),
            ];
        }
        foreach ($reconciliation as $row) {
            if (!is_array($row) || in_array(strtolower(trim((string)($row['exception_status'] ?? 'open'))), ['resolved', 'ignored', 'closed'], true)) {
                continue;
            }
            $exceptionQueue[] = [
                'exception_id' => (string)($row['reconciliation_id'] ?? ''),
                'sync_domain' => (string)($row['sync_domain'] ?? ''),
                'severity' => (string)($row['severity'] ?? 'warning'),
                'type' => 'reconciliation',
                'message_vi' => (string)($row['message_vi'] ?? 'Có sai lệch giữa MES và Epicor cần đối soát.'),
                'message_en' => (string)($row['message_en'] ?? 'There is a reconciliation mismatch between MES and Epicor.'),
                'entity_type' => (string)($row['entity_type'] ?? ''),
                'entity_id' => (string)($row['entity_id'] ?? ''),
                'difference_summary' => (string)($row['difference_summary'] ?? ''),
                'owner_role' => (string)($row['owner_role'] ?? 'epicor_admin'),
                'updated_at' => (string)($row['detected_at'] ?? ''),
            ];
        }
        foreach ($outbox as $row) {
            if (!is_array($row)) {
                continue;
            }
            $status = strtolower(trim((string)($row['publish_status'] ?? 'queued')));
            if (!in_array($status, ['queued', 'retry', 'failed'], true)) {
                continue;
            }
            $exceptionQueue[] = [
                'exception_id' => (string)($row['outbox_event_id'] ?? ''),
                'sync_domain' => (string)($row['sync_domain'] ?? ''),
                'severity' => $status === 'failed' ? 'critical' : 'warning',
                'type' => 'outbox',
                'message_vi' => (string)($row['message_vi'] ?? ($status === 'failed' ? 'Giao dịch outbound bị lỗi khi đẩy sang Epicor.' : 'Giao dịch outbound vẫn đang chờ đẩy sang Epicor.')),
                'message_en' => (string)($row['message_en'] ?? ($status === 'failed' ? 'Outbound transaction failed while publishing to Epicor.' : 'Outbound transaction is still queued for Epicor.')),
                'entity_type' => (string)($row['entity_type'] ?? ''),
                'entity_id' => (string)($row['entity_id'] ?? ''),
                'event_type' => (string)($row['event_type'] ?? ''),
                'retry_count' => (int)($row['retry_count'] ?? 0),
                'owner_role' => 'epicor_admin',
                'updated_at' => (string)($row['last_attempt_at'] ?? $row['first_queued_at'] ?? ''),
            ];
        }

        usort($exceptionQueue, static fn($a, $b) => strcmp((string)($b['updated_at'] ?? ''), (string)($a['updated_at'] ?? '')));

        return [
            'system_name' => (string)($policy['system_name'] ?? 'Epicor Kinetic'),
            'health' => $degraded > 0 ? ($reconciliationOpen > 0 || $outboxPending > 0 ? 'critical' : 'warning') : 'ready',
            'kpis' => [
                'domains_total' => count($domainRows),
                'domains_degraded' => $degraded,
                'sync_failures_open' => count(array_filter($exceptionQueue, static fn($row) => ($row['type'] ?? '') === 'domain_health' && ($row['severity'] ?? '') === 'critical')),
                'reconciliation_open' => $reconciliationOpen,
                'outbox_pending' => $outboxPending,
                'avg_latency_ms' => $latencies ? (int)round(array_sum($latencies) / count($latencies)) : 0,
                'last_success_at' => $lastSuccess,
                'orders_active' => count((array)($orders['work_orders'] ?? [])),
                'machines_live' => count((array)($mes['machine_signals'] ?? [])),
                'customers_governed' => count((array)($master['customers'] ?? [])),
            ],
            'domains' => $domainRows,
            'sync_runs' => array_slice($syncRuns, 0, 20),
            'reconciliation_exceptions' => array_slice($reconciliation, 0, 20),
            'outbox_events' => array_slice($outbox, 0, 20),
            'exception_queue' => array_slice($exceptionQueue, 0, 30),
            'checkpoints' => (array)$store['checkpoints'],
            'health_meta' => (array)$store['health'],
        ];
    }

    private function normalizeDomain(string $value, array $policy): string
    {
        $normalized = strtolower(trim($value));
        if ($normalized === '') {
            throw new RuntimeException('missing_epicor_sync_domain');
        }
        $domains = array_keys((array)($policy['domains'] ?? []));
        if ($domains !== [] && !in_array($normalized, $domains, true)) {
            throw new RuntimeException('invalid_epicor_sync_domain');
        }
        return $normalized;
    }

    private function normalizeDirection(string $value): string
    {
        $normalized = strtolower(trim($value));
        return in_array($normalized, ['inbound', 'outbound', 'bidirectional', 'reconcile'], true)
            ? $normalized
            : 'inbound';
    }

    private function normalizeStatus(string $value): string
    {
        $normalized = strtolower(trim($value));
        return in_array($normalized, ['queued', 'running', 'success', 'failed', 'partial', 'skipped'], true)
            ? $normalized
            : 'queued';
    }

    private function normalizeSeverity(string $value): string
    {
        $normalized = strtolower(trim($value));
        return in_array($normalized, ['ready', 'warning', 'critical'], true)
            ? $normalized
            : 'warning';
    }

    private function normalizeExceptionStatus(string $value): string
    {
        $normalized = strtolower(trim($value));
        return in_array($normalized, ['open', 'investigating', 'resolved', 'ignored', 'closed'], true)
            ? $normalized
            : 'open';
    }

    private function normalizeOutboxStatus(string $value): string
    {
        $normalized = strtolower(trim($value));
        return in_array($normalized, ['queued', 'retry', 'published', 'failed', 'dead_letter', 'acked'], true)
            ? $normalized
            : 'queued';
    }

    private function normalizeTimestamp(string $value): string
    {
        $raw = trim($value);
        if ($raw === '') {
            return '';
        }
        try {
            return (new \DateTimeImmutable($raw))->format(DATE_ATOM);
        } catch (\Throwable) {
            return '';
        }
    }

    private function ageMinutes(string $timestamp, \DateTimeImmutable $now): ?int
    {
        $value = trim($timestamp);
        if ($value === '') {
            return null;
        }
        try {
            $dt = new \DateTimeImmutable($value);
            return max(0, (int)floor(($now->getTimestamp() - $dt->getTimestamp()) / 60));
        } catch (\Throwable) {
            return null;
        }
    }
}
