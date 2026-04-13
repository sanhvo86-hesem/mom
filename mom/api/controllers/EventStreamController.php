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
        // Parse requested channels from query parameter
        $channelsParam = trim($_GET['channels'] ?? 'workflow,notifications,mes,dashboard,dispatch,ai');
        $requestedChannels = array_filter(
            array_map('trim', explode(',', $channelsParam))
        );

        // Map short names to full channel names
        $channelMap = [
            'workflow'      => 'mom:realtime:workflow',
            'notifications' => 'mom:realtime:notifications',
            'mes'           => 'mom:realtime:mes',
            'dashboard'     => 'mom:realtime:dashboard',
            'dispatch'      => 'mom:realtime:dispatch',
            'ai'            => \MOM\Api\Services\EventBroadcaster::CHANNEL_AI,
        ];

        $channels = [];
        foreach ($requestedChannels as $ch) {
            if (isset($channelMap[$ch])) {
                $channels[] = $channelMap[$ch];
            }
        }

        if (empty($channels)) {
            $this->json(['ok' => false, 'error' => 'no_valid_channels'], 400);
            return;
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

                if ($message->kind === 'message') {
                    $data = json_decode($message->payload, true);
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
        echo "data: " . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
        echo "id: " . hrtime(true) . "\n";
        echo "\n";
        flush();
    }
}
