<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Controllers\BaseController;
use MOM\Api\Services\CacheService;
use Throwable;

/**
 * EQMS Real-Time Events Stream — Server-Sent Events (SSE)
 *
 * Streams live quality-domain events to authenticated browser clients using
 * the W3C EventSource protocol.  One persistent GET connection per client
 * replaces polling across all 31 EQMS modules.
 *
 * Architecture:
 *   - Creates a dedicated Predis connection in SUBSCRIBE mode (non-blocking
 *     main connection is kept for cache operations).
 *   - Subscribes to the Redis channels requested by the client.
 *   - Emits typed SSE events, filtering by module / record_id when supplied.
 *   - Sends a `: heartbeat` comment every 25 s to keep the connection alive
 *     through proxies and load balancers.
 *   - Caps the stream at MAX_STREAM_SECONDS; client EventSource reconnects
 *     automatically with the last-event-id header.
 *   - Falls back to a single `connected` event (polling-mode) when Redis is
 *     unreachable — JS client switches to 60-second polling automatically.
 *
 * Supported channels (via ?channels= query param):
 *   workflow       → realtime:workflow      (state transitions on any record)
 *   notifications  → realtime:notifications (user-scoped inbox updates)
 *   dashboard      → realtime:dashboard     (KPI / metric refreshes)
 *   mes            → realtime:mes           (machine state changes)
 *   dispatch       → realtime:dispatch      (scheduling / dispatch events)
 *   ai             → mom:realtime:ai        (AI prediction updates)
 *   all            → all of the above
 *
 * Optional filters (query params):
 *   modules    — comma-separated module ids to receive (e.g. "complaints,capa")
 *   record_id  — stream only events for this record
 *
 * Standards: W3C SSE (WHATWG), RFC 6202
 *
 * @package MOM\Api\Controllers
 * @since   4.1.0
 */
class EqmsEventsController extends BaseController
{
    /** Maximum seconds for a single SSE connection before graceful close. */
    private const MAX_STREAM_SECONDS = 55;

    /** Heartbeat interval in seconds. */
    private const HEARTBEAT_INTERVAL = 25;

    /** Redis channel definitions */
    private const CHANNEL_MAP = [
        'workflow'      => 'realtime:workflow',
        'notifications' => 'realtime:notifications',
        'dashboard'     => 'realtime:dashboard',
        'mes'           => 'realtime:mes',
        'dispatch'      => 'realtime:dispatch',
        'ai'            => 'mom:realtime:ai',
    ];

    // ── Entry Point ──────────────────────────────────────────────────────────

    /**
     * GET /api/v1/eqms/events/stream
     *
     * Establishes the SSE stream.  Must be called as an EventSource from
     * the browser; ordinary REST calls receive a 406.
     */
    public function stream(): never
    {
        // --- Auth ----------------------------------------------------------------
        $user = $this->requireAuth();

        // --- Accept negotiation --------------------------------------------------
        $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
        if (!str_contains($accept, 'text/event-stream')) {
            http_response_code(406);
            header('Content-Type: application/json');
            echo json_encode(['ok' => false, 'error' => 'SSE_REQUIRED', 'message' => 'Use EventSource / Accept: text/event-stream']);
            exit;
        }

        // --- Parse query params --------------------------------------------------
        $requestedChannels = $this->parseChannels($_GET['channels'] ?? 'workflow,notifications');
        $moduleFilter      = $this->parseModuleFilter($_GET['modules'] ?? '');
        $recordIdFilter    = trim($_GET['record_id'] ?? '');
        $lastEventId       = $_SERVER['HTTP_LAST_EVENT_ID'] ?? ($_GET['lastEventId'] ?? '');
        $userId            = $this->getUserId($user);

        // --- SSE headers ---------------------------------------------------------
        @ob_end_clean();
        header('Content-Type: text/event-stream; charset=utf-8');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('X-Accel-Buffering: no');   // nginx: disable buffering
        header('Connection: keep-alive');
        header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
        header('Access-Control-Allow-Credentials: true');

        set_time_limit(0);
        ignore_user_abort(false);

        // --- Attempt Redis subscribe mode ----------------------------------------
        $redisConfig = $this->buildRedisConfig();
        $pubsubClient = $this->createPubSubClient($redisConfig);

        if ($pubsubClient === null) {
            // Redis unavailable — send single event so JS switches to polling
            $this->sseEvent('connected', [
                'mode'        => 'polling',
                'poll_interval' => 60,
                'server_time' => gmdate('c'),
                'channels'    => $requestedChannels,
            ]);
            $this->sseFlush();
            exit;
        }

        // --- Connected handshake event ------------------------------------------
        $this->sseEvent('connected', [
            'mode'        => 'stream',
            'server_time' => gmdate('c'),
            'channels'    => $requestedChannels,
            'user_id'     => $userId,
        ], $lastEventId ?: null);
        $this->sseFlush();

        // --- Build Redis channel list with prefix --------------------------------
        $redisPrefix    = getenv('REDIS_PREFIX') ?: 'mom:';
        $subscribeChannels = [];
        foreach ($requestedChannels as $name) {
            $rawChannel = self::CHANNEL_MAP[$name] ?? null;
            if ($rawChannel) {
                $subscribeChannels[] = $redisPrefix . $rawChannel;
            }
        }

        if (empty($subscribeChannels)) {
            $this->sseEvent('error', ['message' => 'No valid channels requested']);
            $this->sseFlush();
            exit;
        }

        // --- Subscribe loop ------------------------------------------------------
        $startTime     = time();
        $lastHeartbeat = time();
        $eventSeq      = 0;

        try {
            $pubsub = $pubsubClient->pubSubLoop();
            $pubsub->subscribe(...$subscribeChannels);

            foreach ($pubsub as $message) {
                if (connection_aborted()) {
                    break;
                }

                $now = time();

                // Heartbeat
                if ($now - $lastHeartbeat >= self::HEARTBEAT_INTERVAL) {
                    $this->sseHeartbeat($now);
                    $lastHeartbeat = $now;
                }

                // Max stream duration reached
                if ($now - $startTime >= self::MAX_STREAM_SECONDS) {
                    $this->sseEvent('reconnect', [
                        'reason' => 'max_duration',
                        'retry'  => 500,
                    ]);
                    $this->sseFlush();
                    break;
                }

                if (($message['kind'] ?? null) !== 'message') {
                    continue;
                }

                $payload = json_decode((string)($message['payload'] ?? ''), true);
                if (!is_array($payload)) {
                    continue;
                }

                // Module filter
                if ($moduleFilter && isset($payload['record_type'])) {
                    $recordType = strtolower((string)$payload['record_type']);
                    if (!in_array($recordType, $moduleFilter, true)) {
                        continue;
                    }
                }

                // Record ID filter
                if ($recordIdFilter && isset($payload['record_id'])) {
                    if ((string)$payload['record_id'] !== $recordIdFilter) {
                        continue;
                    }
                }

                // Notification channel — only send to target user/roles
                if (str_ends_with((string)($message['channel'] ?? ''), 'realtime:notifications')) {
                    if (!$this->isNotificationForUser($payload, $userId)) {
                        continue;
                    }
                }

                $eventType = (string)($payload['type'] ?? 'update');
                $eventId   = $this->makeEventId(++$eventSeq, $now);

                $this->sseEvent($eventType, $payload, $eventId);
                $this->sseFlush();
            }

            unset($pubsub);
        } catch (Throwable $e) {
            @error_log('[EqmsEventsController] SSE loop error: ' . $e->getMessage());
            $this->sseEvent('error', ['message' => 'Stream interrupted', 'code' => $e->getCode()]);
            $this->sseFlush();
        } finally {
            try {
                $pubsubClient->disconnect();
            } catch (Throwable) {}
        }

        exit;
    }

    // ── Private Helpers ──────────────────────────────────────────────────────

    /**
     * Parse and validate requested channel names from the query string.
     * @return list<string>
     */
    private function parseChannels(string $raw): array
    {
        $requested = array_map('trim', explode(',', strtolower($raw)));

        if (in_array('all', $requested, true)) {
            return array_keys(self::CHANNEL_MAP);
        }

        return array_values(array_filter($requested, fn($c) => isset(self::CHANNEL_MAP[$c])));
    }

    /**
     * Parse module filter list.
     * @return list<string>
     */
    private function parseModuleFilter(string $raw): array
    {
        if ($raw === '') return [];
        return array_values(array_filter(array_map(fn($m) => strtolower(trim($m)), explode(',', $raw))));
    }

    /**
     * Build Redis connection parameters from environment / config.
     * @return array<string,mixed>
     */
    private function buildRedisConfig(): array
    {
        return [
            'scheme'  => 'tcp',
            'host'    => getenv('REDIS_HOST') ?: '127.0.0.1',
            'port'    => (int)(getenv('REDIS_PORT') ?: 6379),
            'timeout' => 2.0,
            'read_write_timeout' => (int)(self::MAX_STREAM_SECONDS + 10),
        ];
    }

    /**
     * Create a dedicated Predis client for pub/sub (separate from cache client).
     * Returns null when Redis is unavailable.
     */
    private function createPubSubClient(array $config): ?\Predis\Client
    {
        try {
            $params = $config;
            $password = getenv('REDIS_PASSWORD') ?: null;
            if ($password) {
                $params['password'] = $password;
            }
            $database = (int)(getenv('REDIS_DATABASE') ?: 0);
            if ($database > 0) {
                $params['database'] = $database;
            }

            $client = new \Predis\Client($params, ['exceptions' => true]);
            $client->connect();
            return $client;
        } catch (Throwable $e) {
            @error_log('[EqmsEventsController] Cannot create pub/sub Redis client: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Whether a notification payload should be delivered to this user.
     */
    private function isNotificationForUser(array $payload, string|int|null $userId): bool
    {
        if ($userId === null) {
            return false;
        }
        $targetUsers = $payload['recipient_users'] ?? [];
        if (in_array((string)$userId, array_map('strval', (array)$targetUsers), true)) {
            return true;
        }
        // Role-based: if the current session user has a matching role
        $targetRoles  = $payload['recipient_roles'] ?? [];
        if (empty($targetRoles)) {
            return true; // broadcast
        }
        $sessionRoles = $this->getUserRoles();
        return (bool)array_intersect($sessionRoles, (array)$targetRoles);
    }

    /**
     * Generate a monotonic event ID: <unix_ts>-<seq>.
     */
    private function makeEventId(int $seq, int $ts): string
    {
        return $ts . '-' . $seq;
    }

    // ── SSE Primitives ───────────────────────────────────────────────────────

    /**
     * Emit a named SSE event with JSON data.
     */
    private function sseEvent(string $eventType, array $data, ?string $id = null): void
    {
        if ($id !== null) {
            echo 'id: ' . $id . "\n";
        }
        echo 'event: ' . $eventType . "\n";
        echo 'data: ' . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n\n";
    }

    /**
     * Emit a keepalive comment line. Resets proxy idle timers without
     * triggering an EventSource `message` event.
     */
    private function sseHeartbeat(int $ts): void
    {
        echo ': heartbeat ' . $ts . "\n\n";
    }

    /**
     * Flush the output buffer to the client.
     */
    private function sseFlush(): void
    {
        if (ob_get_level() > 0) {
            ob_flush();
        }
        flush();
    }

    // ── Session Helpers (thin wrappers around base class) ────────────────────

    private function getUserId(array $user): int|string|null
    {
        return $_SESSION['user_id'] ?? $user['id'] ?? $user['username'] ?? $user['user'] ?? null;
    }

    private function getUserRoles(): array
    {
        return (array)($_SESSION['user_roles'] ?? $_SESSION['roles'] ?? []);
    }
}
