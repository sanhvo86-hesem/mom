<?php
declare(strict_types=1);

namespace HESEM\QMS\Services;

use DateTimeImmutable;
use HESEM\QMS\Database\DataLayer;
use RuntimeException;
use Throwable;

require_once __DIR__ . '/EdgeConnectorService.php';
require_once dirname(__DIR__, 2) . '/database/DataLayer.php';

/**
 * Cron-ready MTConnect poller for pilot and pre-production CNC connectivity.
 */
final class MtconnectPollingService
{
    private readonly string $dataDir;
    private readonly string $rootDir;
    private readonly string $masterFile;
    private readonly string $ordersFile;
    private readonly string $mesFile;
    private readonly string $observabilityFile;

    private EdgeConnectorService $edge;
    private ?DataLayer $dataLayer = null;

    public function __construct(string $dataDir, string $rootDir, ?DataLayer $dataLayer = null)
    {
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->rootDir = rtrim(str_replace('\\', '/', $rootDir), '/');
        $this->masterFile = $this->dataDir . '/master-data/master-data.json';
        $this->ordersFile = $this->dataDir . '/orders/orders.json';
        $this->mesFile = $this->dataDir . '/mes/mes-runtime.json';
        $this->observabilityFile = $this->dataDir . '/runtime-shadow/runtime-observability.json';
        $this->edge = new EdgeConnectorService();
        $this->dataLayer = $dataLayer;
    }

    /**
     * @param array<string, mixed> $options
     * @return array<string, mixed>
     */
    public function pollMachine(string $machineId, array $options = []): array
    {
        $stores = $this->loadStores();
        $result = $this->pollMachineInStores(
            $stores['master'],
            $stores['orders'],
            $stores['mes'],
            trim($machineId),
            $options,
        );

        if (($result['ok'] ?? false) === true || ($result['persist_on_failure'] ?? false) === true) {
            $this->saveMesStore($stores['mes']);
            $this->shadowSync($stores['master'], $stores['orders'], $stores['mes']);
        }

        $result['master'] = $stores['master'];
        $result['orders'] = $stores['orders'];
        $result['mes'] = $stores['mes'];
        return $result;
    }

    /**
     * @param array<string, mixed> $options
     * @return array<string, mixed>
     */
    public function pollAll(array $options = []): array
    {
        $stores = $this->loadStores();
        $master = &$stores['master'];
        $orders = &$stores['orders'];
        $mes = &$stores['mes'];

        $results = [];
        $processed = 0;
        $success = 0;
        $failed = 0;
        $skipped = 0;

        foreach ((array)($master['mes_connectivity_adapters'] ?? []) as $adapter) {
            if (!is_array($adapter)) {
                continue;
            }
            if (strtolower(trim((string)($adapter['adapter_type'] ?? ''))) !== 'mtconnect') {
                continue;
            }
            if (strtolower(trim((string)($adapter['status'] ?? 'active'))) !== 'active') {
                continue;
            }
            $machineId = trim((string)($adapter['machine_id'] ?? ''));
            if ($machineId === '') {
                continue;
            }
            $processed++;
            $result = $this->pollMachineInStores($master, $orders, $mes, $machineId, $options);
            $results[] = $result;
            if (($result['status'] ?? '') === 'skipped') {
                $skipped++;
            } elseif (($result['ok'] ?? false) === true) {
                $success++;
            } else {
                $failed++;
            }
        }

        if ($processed > 0) {
            $this->saveMesStore($mes);
            $this->shadowSync($master, $orders, $mes);
        }

        return [
            'ok' => $failed === 0,
            'processed' => $processed,
            'success' => $success,
            'failed' => $failed,
            'skipped' => $skipped,
            'results' => $results,
            'master' => $master,
            'orders' => $orders,
            'mes' => $mes,
        ];
    }

    /**
     * @param array<string, mixed> $master
     * @param array<string, mixed> $orders
     * @param array<string, mixed> $mes
     * @param array<string, mixed> $options
     * @return array<string, mixed>
     */
    private function pollMachineInStores(array &$master, array &$orders, array &$mes, string $machineId, array $options): array
    {
        $username = trim((string)($options['user_id'] ?? 'system')) ?: 'system';
        $timeoutSeconds = max(3, min(30, (int)($options['timeout_seconds'] ?? 10)));
        $force = (bool)($options['force'] ?? false);
        $adapterId = trim((string)($options['adapter_id'] ?? ''));

        $machines = $this->indexBy((array)($master['machines'] ?? []), 'machine_id');
        $operators = $this->indexBy((array)($master['operators'] ?? []), 'operator_id');
        $machine = $machines[$machineId] ?? null;

        if (!is_array($machine)) {
            $this->observeConnectorIngest($machineId, false, 'machine_not_found', ['action' => 'poll_mtconnect']);
            return ['ok' => false, 'error' => 'machine_not_found', 'machine_id' => $machineId];
        }

        $adapter = $this->findMtconnectAdapter((array)($master['mes_connectivity_adapters'] ?? []), $machineId, $adapterId);
        if ($adapter === null) {
            $this->observeConnectorIngest($machineId, false, 'adapter_not_found', ['action' => 'poll_mtconnect']);
            return ['ok' => false, 'error' => 'adapter_not_found', 'machine_id' => $machineId];
        }

        if (!$force && !$this->shouldPollAdapter($adapter, $mes, $machineId)) {
            return [
                'ok' => true,
                'status' => 'skipped',
                'machine_id' => $machineId,
                'adapter_id' => (string)($adapter['adapter_id'] ?? ''),
                'message' => 'poll_interval_not_elapsed',
            ];
        }

        $pollUrl = '';
        try {
            $pollUrl = $this->normalizePollUrl((string)($options['endpoint_url'] ?? $adapter['endpoint_url'] ?? $machine['connector_endpoint'] ?? ''));
            $xml = $this->httpFetchText($pollUrl, $timeoutSeconds);
            $normalized = $this->edge->normalize([
                'machine_id' => $machineId,
                'connector_type' => 'mtconnect',
                'connector_name' => (string)($adapter['adapter_name'] ?? $machine['connector_name'] ?? 'MTConnect Adapter'),
                'connector_endpoint' => $pollUrl,
                'telemetry_mode' => (string)($machine['telemetry_mode'] ?? 'machine'),
                'source' => 'mtconnect',
                'heartbeat_sla_seconds' => (int)($adapter['heartbeat_sla_seconds'] ?? $machine['heartbeat_sla_seconds'] ?? 120),
                'wo_number' => trim((string)($options['wo_number'] ?? '')),
                'operator_id' => trim((string)($options['operator_id'] ?? '')),
                'note' => trim((string)($options['note'] ?? 'Polled by MTConnect batch cycle.')),
                'mtconnect_xml' => $xml,
            ], $machine, $username);
        } catch (Throwable $e) {
            $event = $this->appendConnectivityEvent($mes, [
                'adapter_id' => (string)($adapter['adapter_id'] ?? ''),
                'machine_id' => $machineId,
                'event_time' => $this->nowIso(),
                'event_type' => 'mtconnect_poll_failed',
                'severity' => 'WARNING',
                'status' => 'open',
                'message' => 'MTConnect poll failed: ' . $e->getMessage(),
                'payload_excerpt' => [
                    'endpoint_url' => $pollUrl !== '' ? $pollUrl : (string)($adapter['endpoint_url'] ?? ''),
                ],
                'recorded_by' => $username,
                'recorded_at' => $this->nowIso(),
            ]);
            $this->observeConnectorIngest($machineId, false, $e->getMessage(), [
                'action' => 'poll_mtconnect',
                'adapter_id' => (string)($adapter['adapter_id'] ?? ''),
                'poll_url' => $pollUrl,
            ]);
            return [
                'ok' => false,
                'error' => $e->getMessage(),
                'machine_id' => $machineId,
                'adapter_id' => (string)($adapter['adapter_id'] ?? ''),
                'poll_url' => $pollUrl,
                'event' => $event,
                'persist_on_failure' => true,
            ];
        }

        $woNumber = trim((string)($normalized['wo_number'] ?? ''));
        if ($woNumber !== '') {
            $wo = $this->findOrderRecord($orders, 'wo', $woNumber);
            if ($wo === null) {
                $this->observeConnectorIngest($machineId, false, 'work_order_not_found', ['action' => 'poll_mtconnect', 'wo_number' => $woNumber]);
                return ['ok' => false, 'error' => 'work_order_not_found', 'machine_id' => $machineId];
            }
            $woMachineId = trim((string)($wo['machine_id'] ?? ''));
            if ($woMachineId !== '' && $woMachineId !== $machineId) {
                $this->observeConnectorIngest($machineId, false, 'wo_machine_mismatch', [
                    'action' => 'poll_mtconnect',
                    'wo_number' => $woNumber,
                    'wo_machine_id' => $woMachineId,
                ]);
                return ['ok' => false, 'error' => 'wo_machine_mismatch', 'machine_id' => $machineId];
            }
        }

        $operatorId = trim((string)($normalized['operator_id'] ?? ''));
        if ($operatorId !== '' && !isset($operators[$operatorId])) {
            $this->observeConnectorIngest($machineId, false, 'operator_not_found', ['action' => 'poll_mtconnect', 'operator_id' => $operatorId]);
            return ['ok' => false, 'error' => 'operator_not_found', 'machine_id' => $machineId];
        }

        $replayGuard = $this->signalReplayGuard($mes, $machine, $normalized);
        if ($replayGuard !== null) {
            $this->observeConnectorIngest($machineId, false, 'stale_signal_timestamp', [
                'action' => 'poll_mtconnect',
                'incoming_signal_at' => (string)($replayGuard['incoming_signal_at'] ?? ''),
                'latest_signal_at' => (string)($replayGuard['latest_signal_at'] ?? ''),
            ]);
            return array_merge(['machine_id' => $machineId, 'ok' => false], $replayGuard);
        }

        $saved = $this->upsertConnectorRuntime($mes, $machine, $normalized, $username);
        $event = $this->appendConnectivityEvent($mes, [
            'adapter_id' => (string)($adapter['adapter_id'] ?? ''),
            'machine_id' => $machineId,
            'event_time' => $this->nowIso(),
            'event_type' => 'mtconnect_poll_ok',
            'severity' => 'INFO',
            'status' => 'closed',
            'message' => 'MTConnect payload polled and ingested successfully.',
            'payload_excerpt' => [
                'endpoint_url' => $pollUrl,
                'signal_at' => (string)($saved['signal']['signal_at'] ?? ''),
                'program_id' => (string)($saved['signal']['current_program_id'] ?? ''),
            ],
            'recorded_by' => $username,
            'recorded_at' => $this->nowIso(),
        ]);
        $this->observeConnectorIngest($machineId, true, 'MTConnect poll completed.', [
            'action' => 'poll_mtconnect',
            'adapter_id' => (string)($adapter['adapter_id'] ?? ''),
            'connector_type' => (string)($saved['feed']['connector_type'] ?? ''),
            'warning_count' => count((array)($saved['ingest_warnings'] ?? [])),
        ]);

        return [
            'ok' => true,
            'machine_id' => $machineId,
            'adapter_id' => (string)($adapter['adapter_id'] ?? ''),
            'poll_url' => $pollUrl,
            'feed' => $saved['feed'],
            'signal' => $saved['signal'],
            'event' => $event,
            'ingest_warnings' => array_values((array)($saved['ingest_warnings'] ?? [])),
        ];
    }

    /**
     * @return array{master: array<string, mixed>, orders: array<string, mixed>, mes: array<string, mixed>}
     */
    private function loadStores(): array
    {
        return [
            'master' => $this->loadJsonFile($this->masterFile, []),
            'orders' => $this->loadJsonFile($this->ordersFile, []),
            'mes' => $this->loadJsonFile($this->mesFile, []),
        ];
    }

    private function saveMesStore(array $mes): void
    {
        $this->saveJsonFile($this->mesFile, $mes);
    }

    private function shadowSync(array $master, array $orders, array $mes): void
    {
        try {
            $layer = $this->dataLayer();
            if ($layer->getMode() === DataLayer::MODE_JSON_ONLY) {
                return;
            }
            $layer->syncMasterDataStore($master);
            $layer->syncOrdersStore($orders);
            $layer->syncMesRuntimeStore($mes, $orders, $master);
        } catch (Throwable $e) {
            $this->observeConnectorIngest('batch', false, 'shadow_sync_failed', [
                'action' => 'poll_mtconnect',
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function dataLayer(): DataLayer
    {
        if ($this->dataLayer === null) {
            $this->dataLayer = new DataLayer($this->dataDir, $this->rootDir);
        }
        return $this->dataLayer;
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array<string, array<string, mixed>>
     */
    private function indexBy(array $rows, string $key): array
    {
        $indexed = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $value = trim((string)($row[$key] ?? ''));
            if ($value === '') {
                continue;
            }
            $indexed[$value] = $row;
        }
        return $indexed;
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    private function findMtconnectAdapter(array $rows, string $machineId, string $adapterId = ''): ?array
    {
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            if ($adapterId !== '' && (string)($row['adapter_id'] ?? '') !== $adapterId) {
                continue;
            }
            if ((string)($row['machine_id'] ?? '') !== $machineId) {
                continue;
            }
            if (strtolower(trim((string)($row['adapter_type'] ?? ''))) !== 'mtconnect') {
                continue;
            }
            return $row;
        }
        return null;
    }

    private function shouldPollAdapter(array $adapter, array $mes, string $machineId): bool
    {
        $interval = max(15, (int)($adapter['poll_interval_seconds'] ?? 60));
        $lastSignalAt = $this->latestSignalTimestamp($mes, $machineId);
        if ($lastSignalAt === '') {
            return true;
        }
        $age = $this->timestampAgeSeconds($lastSignalAt);
        if ($age === null) {
            return true;
        }
        return $age >= $interval;
    }

    private function normalizePollUrl(string $endpoint): string
    {
        $url = trim($endpoint);
        if ($url === '') {
            throw new RuntimeException('missing_connector_endpoint');
        }
        if (!preg_match('~^https?://~i', $url)) {
            throw new RuntimeException('invalid_connector_endpoint');
        }
        if (preg_match('~/current(?:\\?.*)?$~i', $url)) {
            return $url;
        }
        return rtrim($url, '/') . '/current';
    }

    private function httpFetchText(string $url, int $timeoutSeconds): string
    {
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_CONNECTTIMEOUT => max(1, $timeoutSeconds),
                CURLOPT_TIMEOUT => max(2, $timeoutSeconds),
                CURLOPT_HTTPHEADER => ['Accept: application/xml, text/xml, */*'],
            ]);
            $body = curl_exec($ch);
            $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            $error = curl_error($ch);
            curl_close($ch);
            if ($body === false) {
                throw new RuntimeException('connector_http_failed: ' . ($error !== '' ? $error : 'unknown_error'));
            }
            if ($status >= 400) {
                throw new RuntimeException('connector_http_status_' . $status);
            }
            return (string)$body;
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => max(2, $timeoutSeconds),
                'ignore_errors' => true,
                'header' => "Accept: application/xml, text/xml, */*\r\n",
            ],
        ]);
        $body = @file_get_contents($url, false, $context);
        if ($body === false) {
            throw new RuntimeException('connector_http_failed');
        }
        return (string)$body;
    }

    private function latestSignalTimestamp(array $mes, string $machineId): string
    {
        $latest = '';
        foreach ((array)($mes['machine_signals'] ?? []) as $row) {
            if (!is_array($row) || (string)($row['machine_id'] ?? '') !== $machineId) {
                continue;
            }
            $candidate = trim((string)($row['signal_at'] ?? ''));
            if ($candidate !== '' && $candidate > $latest) {
                $latest = $candidate;
            }
        }
        foreach ((array)($mes['connector_feeds'] ?? []) as $row) {
            if (!is_array($row) || (string)($row['machine_id'] ?? '') !== $machineId) {
                continue;
            }
            $candidate = trim((string)($row['last_signal_at'] ?? $row['last_heartbeat_at'] ?? ''));
            if ($candidate !== '' && $candidate > $latest) {
                $latest = $candidate;
            }
        }
        return $latest;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function signalReplayGuard(array $mes, array $machine, array $normalized): ?array
    {
        $machineId = trim((string)($normalized['machine_id'] ?? $machine['machine_id'] ?? ''));
        if ($machineId === '') {
            return null;
        }
        $connectorType = strtolower(trim((string)($normalized['connector_type'] ?? $machine['connector_type'] ?? 'manual_bridge')));
        if (in_array($connectorType, ['manual_bridge', 'disabled'], true)) {
            return null;
        }
        $incoming = trim((string)($normalized['signal_at'] ?? ''));
        if ($incoming === '') {
            return null;
        }
        $latest = $this->latestSignalTimestamp($mes, $machineId);
        if ($latest === '' || $incoming >= $latest) {
            return null;
        }
        return [
            'error' => 'stale_signal_timestamp',
            'message' => 'Incoming signal timestamp is older than the latest accepted machine signal.',
            'machine_id' => $machineId,
            'connector_type' => $connectorType,
            'incoming_signal_at' => $incoming,
            'latest_signal_at' => $latest,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function upsertConnectorRuntime(array &$mes, array $machine, array $normalized, string $username): array
    {
        $machineId = trim((string)($normalized['machine_id'] ?? $machine['machine_id'] ?? ''));
        $signalAt = trim((string)($normalized['signal_at'] ?? '')) ?: $this->nowIso();
        $lastHeartbeatAt = trim((string)($normalized['last_heartbeat_at'] ?? '')) ?: $signalAt;
        $connectorType = strtolower(trim((string)($normalized['connector_type'] ?? $machine['connector_type'] ?? 'manual_bridge'))) ?: 'manual_bridge';
        $heartbeatSla = max(30, (int)($normalized['heartbeat_sla_seconds'] ?? $machine['heartbeat_sla_seconds'] ?? 120));
        $connectorHealth = $this->connectorHealthFromAge($this->timestampAgeSeconds($lastHeartbeatAt), $heartbeatSla, $connectorType);
        $ingest = is_array($normalized['_ingest'] ?? null) ? $normalized['_ingest'] : [];
        $warnings = array_values((array)($ingest['warnings'] ?? []));

        $feeds = array_values((array)($mes['connector_feeds'] ?? []));
        $feedPayload = [
            'feed_id' => '',
            'machine_id' => $machineId,
            'machine_name' => (string)($machine['machine_name'] ?? ''),
            'work_center_id' => (string)($machine['work_center_id'] ?? ''),
            'connector_type' => $connectorType,
            'connector_name' => trim((string)($normalized['connector_name'] ?? $machine['connector_name'] ?? strtoupper($connectorType))),
            'connector_endpoint' => trim((string)($normalized['connector_endpoint'] ?? $machine['connector_endpoint'] ?? '')),
            'telemetry_mode' => (string)($normalized['telemetry_mode'] ?? $machine['telemetry_mode'] ?? ($connectorType === 'manual_bridge' ? 'manual' : 'machine')),
            'heartbeat_sla_seconds' => $heartbeatSla,
            'last_heartbeat_at' => $lastHeartbeatAt,
            'last_signal_at' => $signalAt,
            'connection_status' => $connectorHealth,
            'enabled' => array_key_exists('enabled', $normalized) ? (bool)$normalized['enabled'] : true,
            'updated_at' => $this->nowIso(),
            'updated_by' => $username,
            'ingested_at' => (string)($ingest['ingested_at'] ?? ''),
            'ingested_by' => (string)($ingest['ingested_by'] ?? $username),
            'source_payload_type' => (string)($ingest['source_payload_type'] ?? ''),
            'ingest_warnings' => $warnings,
        ];
        $feedSaved = null;
        foreach ($feeds as $idx => $row) {
            if (!is_array($row) || (string)($row['machine_id'] ?? '') !== $machineId) {
                continue;
            }
            $feedPayload['feed_id'] = (string)($row['feed_id'] ?? '');
            $feeds[$idx] = array_merge($row, $feedPayload);
            $feedSaved = $feeds[$idx];
            break;
        }
        if ($feedSaved === null) {
            $feedPayload['feed_id'] = $this->runtimeId('CNX');
            $feedSaved = $feedPayload;
            $feeds[] = $feedSaved;
        }
        $mes['connector_feeds'] = $feeds;

        $signals = array_values((array)($mes['machine_signals'] ?? []));
        $signalPayload = [
            'signal_id' => '',
            'machine_id' => $machineId,
            'machine_name' => (string)($machine['machine_name'] ?? ''),
            'work_center_id' => (string)($machine['work_center_id'] ?? ''),
            'source' => trim((string)($normalized['source'] ?? $connectorType)),
            'connector_type' => $connectorType,
            'machine_state' => $this->normalizeMachineState((string)($normalized['machine_state'] ?? 'idle')),
            'signal_at' => $signalAt,
            'last_heartbeat_at' => $lastHeartbeatAt,
            'wo_number' => trim((string)($normalized['wo_number'] ?? '')),
            'operator_id' => trim((string)($normalized['operator_id'] ?? '')),
            'current_program_id' => trim((string)($normalized['current_program_id'] ?? '')),
            'spindle_load_pct' => array_key_exists('spindle_load_pct', $normalized) && $normalized['spindle_load_pct'] !== '' ? max(0, min(100, (float)$normalized['spindle_load_pct'])) : null,
            'feed_override_pct' => array_key_exists('feed_override_pct', $normalized) && $normalized['feed_override_pct'] !== '' ? max(0, min(200, (float)$normalized['feed_override_pct'])) : null,
            'part_count' => array_key_exists('part_count', $normalized) && $normalized['part_count'] !== '' ? max(0, (int)$normalized['part_count']) : null,
            'note' => trim((string)($normalized['note'] ?? '')),
            'updated_at' => $this->nowIso(),
            'updated_by' => $username,
            'ingested_at' => (string)($ingest['ingested_at'] ?? ''),
            'ingested_by' => (string)($ingest['ingested_by'] ?? $username),
            'source_payload_type' => (string)($ingest['source_payload_type'] ?? ''),
            'ingest_warnings' => $warnings,
        ];
        $signalSaved = null;
        foreach ($signals as $idx => $row) {
            if (!is_array($row) || (string)($row['machine_id'] ?? '') !== $machineId) {
                continue;
            }
            $signalPayload['signal_id'] = (string)($row['signal_id'] ?? '');
            $signals[$idx] = array_merge($row, $signalPayload);
            $signalSaved = $signals[$idx];
            break;
        }
        if ($signalSaved === null) {
            $signalPayload['signal_id'] = $this->runtimeId('SIG');
            $signalSaved = $signalPayload;
            $signals[] = $signalSaved;
        }
        $mes['machine_signals'] = $signals;

        return [
            'feed' => $feedSaved,
            'signal' => $signalSaved,
            'connector_health' => $connectorHealth,
            'ingest_warnings' => $warnings,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function appendConnectivityEvent(array &$mes, array $event): array
    {
        $rows = array_values((array)($mes['mes_connectivity_events'] ?? []));
        $saved = array_merge([
            'adapter_event_id' => $this->runtimeId('ADP-EVT'),
            'adapter_id' => '',
            'machine_id' => '',
            'event_time' => $this->nowIso(),
            'event_type' => 'adapter_event',
            'severity' => 'INFO',
            'status' => 'closed',
            'message' => '',
            'payload_excerpt' => [],
            'recorded_by' => 'system',
            'recorded_at' => $this->nowIso(),
        ], $event);
        $saved['payload_excerpt'] = is_array($saved['payload_excerpt'] ?? null) ? $saved['payload_excerpt'] : [];
        array_unshift($rows, $saved);
        $mes['mes_connectivity_events'] = array_slice($rows, 0, 400);
        return $saved;
    }

    private function observeConnectorIngest(string $machineId, bool $ok, string $message, array $context = []): void
    {
        $store = $this->loadJsonFile($this->observabilityFile, []);
        if (!is_array($store['connector_ingest'] ?? null)) {
            $store['connector_ingest'] = [
                'machines' => [],
                'totals' => ['success' => 0, 'failure' => 0],
                'recent' => [],
            ];
        }

        $entry = [
            'machine_id' => $machineId,
            'status' => $ok ? 'success' : 'failure',
            'message' => $message,
            'timestamp' => $this->nowIso(),
            'context' => $context,
        ];

        $machines = is_array($store['connector_ingest']['machines'] ?? null) ? $store['connector_ingest']['machines'] : [];
        $machine = array_merge([
            'machine_id' => $machineId,
            'last_status' => 'never',
            'last_success_at' => '',
            'last_error_at' => '',
            'last_message' => '',
            'success_count' => 0,
            'failure_count' => 0,
            'recent' => [],
        ], is_array($machines[$machineId] ?? null) ? $machines[$machineId] : []);
        $machine['last_status'] = $entry['status'];
        $machine['last_message'] = $message;
        if ($ok) {
            $machine['last_success_at'] = $entry['timestamp'];
            $machine['success_count'] = (int)($machine['success_count'] ?? 0) + 1;
            $store['connector_ingest']['totals']['success'] = (int)($store['connector_ingest']['totals']['success'] ?? 0) + 1;
        } else {
            $machine['last_error_at'] = $entry['timestamp'];
            $machine['failure_count'] = (int)($machine['failure_count'] ?? 0) + 1;
            $store['connector_ingest']['totals']['failure'] = (int)($store['connector_ingest']['totals']['failure'] ?? 0) + 1;
        }
        $recentMachine = array_values((array)($machine['recent'] ?? []));
        array_unshift($recentMachine, $entry);
        $machine['recent'] = array_slice($recentMachine, 0, 12);
        $machines[$machineId] = $machine;
        $store['connector_ingest']['machines'] = $machines;
        $recentGlobal = array_values((array)($store['connector_ingest']['recent'] ?? []));
        array_unshift($recentGlobal, $entry);
        $store['connector_ingest']['recent'] = array_slice($recentGlobal, 0, 40);
        $this->saveJsonFile($this->observabilityFile, $store);
    }

    /**
     * @param array<string, mixed> $orders
     * @return array<string, mixed>|null
     */
    private function findOrderRecord(array $orders, string $type, string $id): ?array
    {
        $key = match (strtolower($type)) {
            'so' => 'sales_orders',
            'jo' => 'job_orders',
            default => 'work_orders',
        };
        $field = match ($key) {
            'sales_orders' => 'so_number',
            'job_orders' => 'jo_number',
            default => 'wo_number',
        };
        foreach ((array)($orders[$key] ?? []) as $row) {
            if (is_array($row) && (string)($row[$field] ?? '') === $id) {
                return $row;
            }
        }
        return null;
    }

    private function connectorHealthFromAge(?int $ageSeconds, int $slaSeconds, string $connectorType): string
    {
        $type = strtolower(trim($connectorType));
        if ($type === 'disabled') {
            return 'disabled';
        }
        if ($type === 'manual_bridge') {
            return 'manual_only';
        }
        if ($ageSeconds === null) {
            return 'offline';
        }
        if ($ageSeconds <= max(30, $slaSeconds)) {
            return 'healthy';
        }
        if ($ageSeconds <= max(60, (int)round($slaSeconds * 1.5))) {
            return 'delayed';
        }
        if ($ageSeconds <= max(120, $slaSeconds * 2)) {
            return 'stale';
        }
        return 'offline';
    }

    private function normalizeMachineState(string $state): string
    {
        $normalized = strtolower(trim($state));
        return match ($normalized) {
            'active', 'executing', 'running', 'cycle', 'cycle_start' => 'running',
            'ready', 'idle', 'stop', 'stopped' => 'idle',
            'setup', 'changeover' => 'setup',
            'inspection', 'measure', 'measuring' => 'inspection',
            'feed_hold', 'hold', 'held', 'on_hold' => 'on_hold',
            'down', 'fault', 'alarm', 'error', 'emergency_stop' => 'down',
            'maintenance', 'pm' => 'maintenance',
            'offline', 'disconnected' => 'offline',
            default => $normalized === '' ? 'idle' : $normalized,
        };
    }

    private function timestampAgeSeconds(string $timestamp): ?int
    {
        $raw = trim($timestamp);
        if ($raw === '') {
            return null;
        }
        try {
            return max(0, time() - (new DateTimeImmutable($raw))->getTimestamp());
        } catch (Throwable) {
            return null;
        }
    }

    private function nowIso(): string
    {
        return gmdate('c');
    }

    private function runtimeId(string $prefix): string
    {
        return strtoupper($prefix) . '-' . gmdate('YmdHis') . '-' . substr(bin2hex(random_bytes(3)), 0, 6);
    }

    /**
     * @param array<string, mixed> $fallback
     * @return array<string, mixed>
     */
    private function loadJsonFile(string $path, array $fallback): array
    {
        if (!is_file($path)) {
            return $fallback;
        }
        $raw = @file_get_contents($path);
        if ($raw === false || trim($raw) === '') {
            return $fallback;
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : $fallback;
    }

    /**
     * @param array<string, mixed> $data
     */
    private function saveJsonFile(string $path, array $data): void
    {
        $dir = dirname($path);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new RuntimeException('json_encode_failed');
        }
        file_put_contents($path, $json . PHP_EOL, LOCK_EX);
    }
}
