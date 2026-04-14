<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EventStreamController - Server-Sent Events (SSE) endpoint.
 *
 * Provides real-time push to browser clients via SSE. Subscribes to
 * Redis Pub/Sub channels and forwards events as SSE messages.
 *
 * Endpoint: GET /api/events/stream?channels=workflow,mes,notifications
 *
 * @package MOM\Api\Controllers
 * @since   2.1.0
 */
class EventStreamController extends BaseController
{
    /**
     * SSE stream handler.
     * Keeps the connection open and pushes events as they arrive.
     */
    public function stream(): void
    {
        // GOV-001: Require authentication before allowing event stream subscription
        $user = $this->requireAuth();

        // Parse requested channels from query parameter
        $channelsParam = trim($_GET['channels'] ?? 'workflow,notifications,mes,dashboard,dispatch,ai');
        $requestedChannels = array_filter(
            array_map('trim', explode(',', $channelsParam))
        );

        // Map short names to full channel names with required role mapping
        // GOV-001: Validate user is authorized for requested channels
        $channelMap = [
            'workflow'      => ['channel' => 'mom:realtime:workflow', 'required_roles' => ['admin', 'it_admin', 'production_manager', 'production_director', 'process_engineer']],
            'notifications' => ['channel' => 'mom:realtime:notifications', 'required_roles' => []],  // All authenticated users
            'mes'           => ['channel' => 'mom:realtime:mes', 'required_roles' => ['admin', 'it_admin', 'production_manager', 'shift_leader', 'cnc_workshop_manager']],
            'dashboard'     => ['channel' => 'mom:realtime:dashboard', 'required_roles' => ['admin', 'it_admin', 'production_manager', 'production_director']],
            'dispatch'      => ['channel' => 'mom:realtime:dispatch', 'required_roles' => ['admin', 'it_admin', 'production_manager', 'shift_leader', 'quality_manager']],
            'ai'            => ['channel' => \MOM\Api\Services\EventBroadcaster::CHANNEL_AI, 'required_roles' => ['admin', 'it_admin', 'engineering_lead', 'process_engineer']],
        ];

        // Get user's org_id for channel scoping (GOV-002)
        $orgId = $_SESSION['org_id'] ?? null;
        if ($orgId === null) {
            $this->json(['ok' => false, 'error' => 'org_context_required'], 400);
        }

        $channels = [];
        foreach ($requestedChannels as $ch) {
            if (!isset($channelMap[$ch])) {
                continue;
            }

            $channelSpec = $channelMap[$ch];
            $requiredRoles = $channelSpec['required_roles'];

            // GOV-001: If channel has role restrictions, verify user has at least one required role
            if (!empty($requiredRoles)) {
                if (!$this->userHasAnyRole($user, $requiredRoles)) {
                    // Return 403 Forbidden for channels user is not authorized for
                    $this->json(['ok' => false, 'error' => 'channel_authorization_required', 'channel' => $ch], 403);
                }
            }

            // GOV-002: Append org_id to channel name for organization scoping
            $scopedChannel = $channelSpec['channel'] . '.' . $orgId;
            $channels[] = $scopedChannel;
        }

        if (empty($channels)) {
            $this->json(['ok' => false, 'error' => 'no_valid_channels'], 400);
        }

        // SSE headers
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('Connection: keep-alive');
        header('X-Accel-Buffering: no'); // Disable nginx buffering

        // Disable PHP output buffering
        while (ob_get_level() > 0) {
            ob_end_flush();
        }

        // Send initial connection event
        $this->sendSseEvent('connected', [
            'channels' => $requestedChannels,
            'server_time' => gmdate('c'),
        ]);

        // Try Redis Pub/Sub
        $redisHost = getenv('REDIS_HOST') ?: '127.0.0.1';
        $redisPort = (int)(getenv('REDIS_PORT') ?: 6379);

        try {
            $redis = new \Predis\Client([
                'scheme' => 'tcp',
                'host'   => $redisHost,
                'port'   => $redisPort,
                'read_write_timeout' => 0, // No timeout for subscribe
            ]);

            // Subscribe to channels
            $pubsub = $redis->pubSubLoop();
            $pubsub->subscribe(...$channels);

            // Heartbeat tracking
            $lastHeartbeat = time();

            foreach ($pubsub as $message) {
                if (connection_aborted()) {
                    break;
                }

                $kind = is_array($message) ? (string)($message['kind'] ?? '') : (string)($message->kind ?? '');
                $payload = is_array($message) ? (string)($message['payload'] ?? '') : (string)($message->payload ?? '');
                if ($kind === 'message') {
                    $data = json_decode($payload, true);
                    $eventType = $data['type'] ?? 'event';
                    $this->sendSseEvent($eventType, $data);
                }

                // Send heartbeat every 30 seconds
                if (time() - $lastHeartbeat >= 30) {
                    $this->sendSseEvent('heartbeat', ['server_time' => gmdate('c')]);
                    $lastHeartbeat = time();
                }
            }

            $pubsub->unsubscribe();
        } catch (\Throwable $e) {
            // Redis unavailable — fall back to polling hint
            $this->sendSseEvent('fallback', [
                'message' => 'Redis unavailable, use polling',
                'poll_interval_ms' => 5000,
            ]);

            // Keep connection alive with heartbeats for 60 seconds then close
            $start = time();
            while (!connection_aborted() && (time() - $start) < 60) {
                $this->sendSseEvent('heartbeat', ['server_time' => gmdate('c')]);
                sleep(15);
            }
        }
    }

    /**
     * Send an SSE-formatted event.
     */
    private function sendSseEvent(string $event, array $data): void
    {
        echo "event: {$event}\n";
        $encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        echo "data: " . ($encoded === false ? '{"ok":false,"error":"sse_encode_failed"}' : $encoded) . "\n";
        echo "id: " . hrtime(true) . "\n";
        echo "\n";
        flush();
    }
}
