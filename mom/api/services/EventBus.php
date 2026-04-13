<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * EventBus - Central event publishing and subscription hub.
 *
 * Publishes DomainEvents to:
 *   1. RabbitMQ (via QueueService) for async consumers
 *   2. Redis Pub/Sub (via EventBroadcaster) for real-time SSE clients
 *   3. In-process listeners for synchronous reactions
 *
 * Consumers handle: notifications, analytics, integration sync,
 * auto-CAPA creation, KPI updates, etc.
 *
 * @package MOM\Api\Services
 * @since   2.1.0
 */
final class EventBus
{
    private ?QueueService $queue;
    private ?EventBroadcaster $broadcaster;
    private ?LogTransport $log;

    /** @var array<string, list<callable>> In-process listeners: eventType => [handlers] */
    private array $listeners = [];

    /** @var list<DomainEvent> Events buffered for batch publish */
    private array $buffer = [];

    /** @var bool Whether to buffer events or publish immediately */
    private bool $buffering = false;

    private static ?self $instance = null;

    public function __construct(
        ?QueueService $queue = null,
        ?EventBroadcaster $broadcaster = null,
        ?LogTransport $log = null
    ) {
        $this->queue = $queue;
        $this->broadcaster = $broadcaster;
        $this->log = $log;
    }

    /**
     * Get or create singleton instance.
     * Used when dependency injection is not available (legacy code paths).
     */
    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Set the singleton instance (for bootstrap injection).
     */
    public static function setInstance(self $instance): void
    {
        self::$instance = $instance;
    }

    // ── Publishing ──────────────────────────────────────────────────────

    /**
     * Publish a domain event.
     *
     * Distributes to all channels: queue, broadcaster, in-process listeners.
     */
    public function publish(DomainEvent $event): void
    {
        if ($this->buffering) {
            $this->buffer[] = $event;
            return;
        }

        $this->doPublish($event);
    }

    /**
     * Publish a domain event (convenience: create from params).
     */
    public function emit(
        string $eventType,
        string $aggregateType,
        string $aggregateId,
        array $payload = [],
        array $metadata = []
    ): void {
        $this->publish(new DomainEvent($eventType, $aggregateType, $aggregateId, $payload, $metadata));
    }

    /**
     * Start buffering events (useful for transactions).
     * Events are held until flush() is called.
     */
    public function startBuffering(): void
    {
        $this->buffering = true;
    }

    /**
     * Flush all buffered events.
     */
    public function flush(): void
    {
        $this->buffering = false;
        $events = $this->buffer;
        $this->buffer = [];

        foreach ($events as $event) {
            $this->doPublish($event);
        }
    }

    /**
     * Discard buffered events (e.g. on transaction rollback).
     */
    public function discard(): void
    {
        $this->buffering = false;
        $this->buffer = [];
    }

    // ── Subscription ────────────────────────────────────────────────────

    /**
     * Register an in-process listener for an event type.
     *
     * @param string   $eventType Event type or '*' for all events
     * @param callable $handler   function(DomainEvent): void
     */
    public function on(string $eventType, callable $handler): void
    {
        $this->listeners[$eventType][] = $handler;
    }

    /**
     * Register a listener for multiple event types.
     *
     * @param list<string> $eventTypes
     * @param callable     $handler
     */
    public function onAny(array $eventTypes, callable $handler): void
    {
        foreach ($eventTypes as $type) {
            $this->on($type, $handler);
        }
    }

    // ── Built-in Reactive Rules ─────────────────────────────────────────

    /**
     * Register standard reactive rules.
     * Call this during bootstrap to enable automatic behaviors.
     */
    public function registerDefaultRules(): void
    {
        // Auto-create CAPA when NCR reaches 'pending_capa' state
        $this->on(DomainEvent::WORKFLOW_TRANSITIONED, function (DomainEvent $event) {
            $toState = $event->payload['to_state'] ?? '';
            if ($toState === 'pending_capa' || $toState === 'capa_required') {
                $this->log?->info('event_bus', [
                    'rule'     => 'auto_capa',
                    'trigger'  => $event->eventId,
                    'ncr_id'   => $event->aggregateId,
                    'to_state' => $toState,
                ]);
                // The actual CAPA creation would be handled by a queue consumer
                // to avoid synchronous coupling
                $this->queue?->publish('quality.capa.auto_create', [
                    'source_type' => $event->aggregateType,
                    'source_id'   => $event->aggregateId,
                    'reason'      => "Auto-triggered by workflow transition to {$toState}",
                ]);
            }
        });

        // Log all record mutations for analytics
        $this->onAny([
            DomainEvent::RECORD_CREATED,
            DomainEvent::RECORD_UPDATED,
            DomainEvent::RECORD_DELETED,
        ], function (DomainEvent $event) {
            $this->log?->info('event_bus', [
                'rule'      => 'mutation_log',
                'event'     => $event->eventType,
                'aggregate' => $event->aggregateType,
                'id'        => $event->aggregateId,
            ]);
        });

        // Broadcast quality events to real-time dashboard
        $this->onAny([
            DomainEvent::NCR_OPENED,
            DomainEvent::NCR_CLOSED,
            DomainEvent::INSPECTION_FAILED,
            DomainEvent::SPC_OUT_OF_CONTROL,
        ], function (DomainEvent $event) {
            $this->broadcaster?->dashboardUpdated('quality_events', $event->toArray());
        });

        // Broadcast MES events
        $this->on(DomainEvent::MACHINE_STATE_CHANGED, function (DomainEvent $event) {
            $machineId = $event->aggregateId;
            $state = $event->payload['state'] ?? 'unknown';
            $this->broadcaster?->mesStateChanged($machineId, $state, $event->payload);
        });

        // ─── AI Reactive Rules / Quy tắc phản ứng AI ─────────────────────────

        // Rule: SPC out-of-control → create AI prediction
        // Quy tắc: SPC vượt kiểm soát → tạo dự đoán AI
        $this->on(DomainEvent::SPC_OUT_OF_CONTROL, function (DomainEvent $event) {
            try {
                $pipeline = new AiPredictionPipeline('');
                $pipeline->createPrediction([
                    'prediction_type'  => 'spc_anomaly',
                    'severity'         => ($event->payload['rule_violations'] ?? 0) >= 3 ? 'critical' : 'warning',
                    'entity_type'      => 'spc_observation',
                    'entity_id'        => $event->payload['observation_id'] ?? $event->aggregateId,
                    'machine_id'       => $event->payload['machine_id'] ?? '',
                    'confidence_score' => 85.0,
                    'recommendation'   => 'SPC out-of-control detected: ' . ($event->payload['rules_triggered'] ?? 'unknown rules'),
                    'metadata'         => $event->payload,
                ]);
            } catch (\Throwable $e) {
                @error_log('[EventBus/AI] SPC rule failed: ' . $e->getMessage());
            }
        });

        // Rule: Machine alarm/fault → equipment failure prediction
        // Quy tắc: Máy báo lỗi/sự cố → dự đoán lỗi thiết bị
        $this->on(DomainEvent::MACHINE_STATE_CHANGED, function (DomainEvent $event) {
            $state = $event->payload['new_state'] ?? $event->payload['state'] ?? '';
            if (!in_array($state, ['alarm', 'fault', 'emergency_stop'], true)) {
                return;
            }
            try {
                $pipeline = new AiPredictionPipeline('');
                $pipeline->createPrediction([
                    'prediction_type'  => 'equipment_failure',
                    'severity'         => $state === 'emergency_stop' ? 'critical' : 'warning',
                    'entity_type'      => 'machine',
                    'entity_id'        => $event->aggregateId,
                    'machine_id'       => $event->payload['machine_id'] ?? $event->aggregateId,
                    'confidence_score' => 90.0,
                    'recommendation'   => 'Machine state changed to: ' . $state,
                    'metadata'         => $event->payload,
                ]);
            } catch (\Throwable $e) {
                @error_log('[EventBus/AI] Machine state rule failed: ' . $e->getMessage());
            }
        });

        // Rule: Inspection failed → recalculate defect probability
        // Quy tắc: Kiểm tra thất bại → tính lại xác suất lỗi
        $this->on(DomainEvent::INSPECTION_FAILED, function (DomainEvent $event) {
            try {
                $pipeline = new AiPredictionPipeline('');
                $pipeline->createPrediction([
                    'prediction_type'  => 'defect_probability',
                    'severity'         => 'warning',
                    'entity_type'      => 'inspection',
                    'entity_id'        => $event->payload['inspection_id'] ?? $event->aggregateId,
                    'machine_id'       => $event->payload['machine_id'] ?? '',
                    'confidence_score' => 75.0,
                    'recommendation'   => 'Inspection failure detected - elevated defect probability',
                    'metadata'         => $event->payload,
                ]);
            } catch (\Throwable $e) {
                @error_log('[EventBus/AI] Inspection rule failed: ' . $e->getMessage());
            }
        });
    }

    // ── Internal ────────────────────────────────────────────────────────

    private function doPublish(DomainEvent $event): void
    {
        $data = $event->toArray();

        // 1. RabbitMQ queue (async consumers)
        $this->queue?->publish($event->eventType, $data);

        // 2. Redis Pub/Sub (real-time SSE)
        $this->broadcastToRealtime($event);

        // 3. In-process listeners (synchronous)
        $this->notifyListeners($event);

        // 4. Log transport
        $this->log?->info('domain_event', $data);
    }

    private function broadcastToRealtime(DomainEvent $event): void
    {
        if (!$this->broadcaster) return;

        // Map event types to SSE channels
        $type = $event->eventType;

        if (str_starts_with($type, 'workflow.')) {
            $this->broadcaster->workflowTransitioned(
                $event->aggregateType,
                $event->aggregateId,
                $event->payload['from_state'] ?? '',
                $event->payload['to_state'] ?? '',
                $event->metadata['user_id'] ?? 'system'
            );
        } elseif (str_starts_with($type, 'mes.') || str_starts_with($type, 'manufacturing.')) {
            $this->broadcaster->broadcast(EventBroadcaster::CHANNEL_MES, $event->toArray());
        } elseif (str_starts_with($type, 'quality.')) {
            $this->broadcaster->dashboardUpdated('quality', $event->toArray());
        }
    }

    private function notifyListeners(DomainEvent $event): void
    {
        // Exact match listeners
        foreach ($this->listeners[$event->eventType] ?? [] as $handler) {
            try {
                $handler($event);
            } catch (\Throwable $e) {
                error_log("[EventBus] Listener error for {$event->eventType}: {$e->getMessage()}");
                $this->log?->error("EventBus listener error: {$e->getMessage()}", [
                    'event_type' => $event->eventType,
                    'event_id'   => $event->eventId,
                ]);
            }
        }

        // Wildcard listeners
        foreach ($this->listeners['*'] ?? [] as $handler) {
            try {
                $handler($event);
            } catch (\Throwable $e) {
                error_log("[EventBus] Wildcard listener error: {$e->getMessage()}");
            }
        }
    }
}
