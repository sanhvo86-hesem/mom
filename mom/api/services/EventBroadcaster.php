<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * EventBroadcaster - Publishes real-time events via Redis Pub/Sub.
 *
 * Used by WorkflowEngine, NotificationGateway, and MES signals to push
 * updates to SSE-connected clients. Falls back to no-op when Redis is
 * unavailable (clients will use polling).
 *
 * @package MOM\Api\Services
 * @since   2.1.0
 */
final class EventBroadcaster
{
    private CacheService $cache;

    // Channel prefixes
    public const CHANNEL_WORKFLOW      = 'realtime:workflow';
    public const CHANNEL_NOTIFICATIONS = 'realtime:notifications';
    public const CHANNEL_MES           = 'realtime:mes';
    public const CHANNEL_DASHBOARD     = 'realtime:dashboard';
    public const CHANNEL_DISPATCH      = 'realtime:dispatch';
    public const CHANNEL_AI            = 'mom:realtime:ai';

    public function __construct(CacheService $cache)
    {
        $this->cache = $cache;
    }

    /**
     * Broadcast a workflow state transition.
     */
    public function workflowTransitioned(
        string $recordType,
        string $recordId,
        string $fromState,
        string $toState,
        string $userId
    ): void {
        $this->broadcast(self::CHANNEL_WORKFLOW, [
            'type'        => 'workflow.transitioned',
            'record_type' => $recordType,
            'record_id'   => $recordId,
            'from_state'  => $fromState,
            'to_state'    => $toState,
            'user_id'     => $userId,
            'timestamp'   => gmdate('c'),
        ]);
    }

    /**
     * Broadcast a notification.
     */
    public function notificationSent(array $notification): void
    {
        $this->broadcast(self::CHANNEL_NOTIFICATIONS, [
            'type'           => 'notification.new',
            'notification_id' => $notification['notification_id'] ?? null,
            'category'       => $notification['category'] ?? null,
            'priority'       => $notification['priority'] ?? null,
            'message_en'     => $notification['message_en'] ?? null,
            'recipient_roles' => $notification['recipient_roles'] ?? [],
            'recipient_users' => $notification['recipient_users'] ?? [],
            'timestamp'      => gmdate('c'),
        ]);
    }

    /**
     * Broadcast MES machine state change.
     */
    public function mesStateChanged(string $machineId, string $state, array $data = []): void
    {
        $this->broadcast(self::CHANNEL_MES, array_merge([
            'type'       => 'mes.state_changed',
            'machine_id' => $machineId,
            'state'      => $state,
            'timestamp'  => gmdate('c'),
        ], $data));
    }

    /**
     * Broadcast dashboard data update.
     */
    public function dashboardUpdated(string $widget, array $data = []): void
    {
        $this->broadcast(self::CHANNEL_DASHBOARD, [
            'type'      => 'dashboard.updated',
            'widget'    => $widget,
            'data'      => $data,
            'timestamp' => gmdate('c'),
        ]);
    }

    /**
     * Broadcast dispatch status change.
     */
    public function dispatchUpdated(array $data): void
    {
        $this->broadcast(self::CHANNEL_DISPATCH, array_merge([
            'type'      => 'dispatch.updated',
            'timestamp' => gmdate('c'),
        ], $data));
    }

    /**
     * Broadcast AI prediction update.
     * Phát cập nhật dự đoán AI.
     */
    public function aiPredictionUpdated(string $type, array $data = []): void
    {
        $this->broadcast(self::CHANNEL_AI, [
            'type'      => 'ai.prediction.' . $type,
            'data'      => $data,
            'timestamp' => gmdate('c'),
        ]);
    }

    /**
     * Generic broadcast to a channel.
     */
    public function broadcast(string $channel, array $data): void
    {
        $this->cache->publish($channel, $data);
    }
}
