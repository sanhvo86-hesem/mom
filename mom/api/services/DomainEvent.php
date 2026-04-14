<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * DomainEvent - Immutable value object representing a domain event.
 *
 * Domain events capture facts that have occurred in the system.
 * They are published after state changes are committed and can be
 * consumed by multiple subscribers (notifications, analytics, integrations).
 *
 * @package MOM\Api\Services
 * @since   2.1.0
 */
final class DomainEvent
{
    public readonly string $eventId;
    public readonly string $eventType;
    public readonly string $aggregateType;
    public readonly string $aggregateId;
    public readonly array $payload;
    public readonly array $metadata;
    public readonly string $occurredAt;

    // ── Event Type Constants ────────────────────────────────────────────

    // Workflow events
    public const WORKFLOW_TRANSITIONED  = 'workflow.transitioned';
    public const WORKFLOW_REJECTED      = 'workflow.rejected';
    public const WORKFLOW_ESCALATED     = 'workflow.escalated';

    // CRUD events
    public const RECORD_CREATED = 'record.created';
    public const RECORD_UPDATED = 'record.updated';
    public const RECORD_DELETED = 'record.deleted';

    // Quality events
    public const NCR_OPENED      = 'quality.ncr.opened';
    public const NCR_CLOSED      = 'quality.ncr.closed';
    public const CAPA_REQUIRED   = 'quality.capa.required';
    public const SPC_OUT_OF_CONTROL = 'quality.spc.out_of_control';
    public const INSPECTION_FAILED  = 'quality.inspection.failed';

    // Manufacturing events
    public const JOB_STARTED     = 'manufacturing.job.started';
    public const JOB_COMPLETED   = 'manufacturing.job.completed';
    public const DISPATCH_CHANGED = 'manufacturing.dispatch.changed';
    public const ALARM_TRIGGERED = 'manufacturing.alarm.triggered';

    // MES events
    public const MACHINE_STATE_CHANGED = 'mes.machine.state_changed';
    public const OEE_THRESHOLD_BREACH  = 'mes.oee.threshold_breach';

    // Supply chain events
    public const PO_RECEIVED     = 'supply.po.received';
    public const SHIPMENT_READY  = 'supply.shipment.ready';

    // Finance events
    public const PERIOD_CLOSED   = 'finance.period.closed';

    // AI events / Sự kiện AI
    public const AI_PREDICTION_CREATED   = 'ai.prediction.created';
    public const AI_PREDICTION_ACTIONED  = 'ai.prediction.actioned';
    public const AI_FEEDBACK_RECORDED    = 'ai.feedback.recorded';
    public const AI_ANALYSIS_COMPLETED   = 'ai.analysis.completed';
    public const AI_SCHEDULE_OPTIMIZED   = 'ai.schedule.optimized';

    public function __construct(
        string $eventType,
        string $aggregateType,
        string $aggregateId,
        array $payload = [],
        array $metadata = []
    ) {
        // OPS-R6-005: Validate eventType, aggregateType, aggregateId
        if (empty($aggregateType) || strlen($aggregateType) > 128) {
            throw new \RuntimeException('invalid_aggregate_type');
        }
        if (empty($aggregateId) || strlen($aggregateId) > 256) {
            throw new \RuntimeException('invalid_aggregate_id');
        }

        // OPS-R6-026: Increase entropy from 4 bytes to 8 bytes
        $this->eventId = sprintf('evt-%s-%s', gmdate('YmdHis'), bin2hex(random_bytes(8)));
        $this->eventType = $eventType;
        $this->aggregateType = $aggregateType;
        $this->aggregateId = $aggregateId;
        $this->payload = $payload;

        // OPS-R6-005: Whitelist metadata keys
        $whitelistedMetadata = [];
        foreach (['user_id', 'request_id', 'ip'] as $key) {
            if (isset($metadata[$key])) {
                $whitelistedMetadata[$key] = $metadata[$key];
            }
        }

        $this->metadata = array_merge([
            'user_id'    => $_SESSION['user'] ?? 'system',
            'ip'         => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0',
            'request_id' => $_SERVER['HTTP_X_REQUEST_ID'] ?? null,
        ], $whitelistedMetadata);
        $this->occurredAt = gmdate('c');
    }

    /**
     * Convert to array for serialization.
     */
    public function toArray(): array
    {
        return [
            'event_id'       => $this->eventId,
            'event_type'     => $this->eventType,
            'aggregate_type' => $this->aggregateType,
            'aggregate_id'   => $this->aggregateId,
            'payload'        => $this->payload,
            'metadata'       => $this->metadata,
            'occurred_at'    => $this->occurredAt,
        ];
    }

    // ── Factory Methods ─────────────────────────────────────────────────

    /**
     * Create a workflow transition event.
     */
    public static function workflowTransitioned(
        string $recordType,
        string $recordId,
        string $fromState,
        string $toState,
        string $userId,
        array $triggeredActions = [],
        ?string $comment = null
    ): self {
        return new self(
            self::WORKFLOW_TRANSITIONED,
            $recordType,
            $recordId,
            [
                'from_state'        => $fromState,
                'to_state'          => $toState,
                'triggered_actions' => $triggeredActions,
                'comment'           => $comment,
            ],
            ['user_id' => $userId]
        );
    }

    /**
     * Create a record created event.
     */
    public static function recordCreated(
        string $domain,
        string $table,
        string $recordId,
        array $record
    ): self {
        return new self(
            self::RECORD_CREATED,
            "{$domain}.{$table}",
            $recordId,
            ['record' => $record]
        );
    }

    /**
     * Create a record updated event.
     */
    public static function recordUpdated(
        string $domain,
        string $table,
        string $recordId,
        array $changes,
        array $oldValues = []
    ): self {
        return new self(
            self::RECORD_UPDATED,
            "{$domain}.{$table}",
            $recordId,
            [
                'changes'    => $changes,
                'old_values' => $oldValues,
            ]
        );
    }

    /**
     * Create a record deleted event.
     */
    public static function recordDeleted(
        string $domain,
        string $table,
        string $recordId,
        string $deletionMode = 'soft',
        array $lastSnapshot = []
    ): self {
        return new self(
            self::RECORD_DELETED,
            "{$domain}.{$table}",
            $recordId,
            [
                'deletion_mode' => $deletionMode,
                'last_snapshot' => $lastSnapshot,
            ]
        );
    }
}
