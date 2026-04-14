<?php

declare(strict_types=1);

namespace MOM\Services\ChangeControl;

use RuntimeException;

/**
 * Executes the immediate DB-visible side effects of a released change order.
 * External work remains outbox-driven, but release cannot be a label-only update.
 */
final class ChangeReleaseSideEffectService
{
    public function __construct(private readonly ?object $db = null)
    {
    }

    /**
     * @param array<string, mixed> $changeOrder
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function apply(array $changeOrder, array $context): array
    {
        if ($this->db === null || !method_exists($this->db, 'queryOne')) {
            throw new RuntimeException('change_release_side_effect_store_required');
        }

        $changeOrderId = $this->text($changeOrder['plm_change_order_id'] ?? $context['change_order_id'] ?? '');
        if ($changeOrderId === '') {
            throw new RuntimeException('change_release_side_effect_order_required');
        }

        $effects = [];
        $effects['affected_scope_frozen'] = $this->update(
            "UPDATE plm_change_affected_objects
             SET disposition = CASE WHEN disposition = 'pending' THEN 'accepted' ELSE disposition END,
                 metadata = COALESCE(metadata, '{}'::jsonb) || CAST(:metadata AS jsonb),
                 updated_at = now()
             WHERE plm_change_order_id = CAST(:change_order_id AS uuid)
             RETURNING plm_change_affected_object_id",
            $changeOrderId,
            ['side_effect' => 'freeze_change_scope'],
        );
        $effects['resulting_objects_released'] = $this->update(
            "UPDATE plm_change_resulting_objects
             SET release_state = CASE WHEN release_state IN ('planned', 'ready') THEN 'released' ELSE release_state END,
                 metadata = COALESCE(metadata, '{}'::jsonb) || CAST(:metadata AS jsonb),
                 updated_at = now()
             WHERE plm_change_order_id = CAST(:change_order_id AS uuid)
             RETURNING plm_change_resulting_object_id",
            $changeOrderId,
            ['side_effect' => 'authorize_resulting_objects'],
        );
        $effects['effectivity_activated'] = $this->update(
            "UPDATE plm_change_effectivities
             SET metadata = COALESCE(metadata, '{}'::jsonb) || CAST(:metadata AS jsonb),
                 updated_at = now()
             WHERE plm_change_order_id = CAST(:change_order_id AS uuid)
             RETURNING plm_change_effectivity_id",
            $changeOrderId,
            ['side_effect' => 'activate_effectivity', 'effectivity_state' => 'active'],
        );
        $effects['training_tasks_enqueued'] = $this->update(
            "INSERT INTO outbox_events
                (aggregate_type, aggregate_id, event_type, handler_key, payload, idempotency_key)
             VALUES
                ('plm_change_order', :change_order_id, 'ChangeTrainingTasksRequired', 'training.gate.enqueue',
                 CAST(:payload AS jsonb), :idempotency_key)
             ON CONFLICT (idempotency_key) DO NOTHING
             RETURNING outbox_event_id",
            $changeOrderId,
            ['side_effect' => 'enqueue_training_tasks'],
        );

        return [
            'side_effect_state' => 'applied',
            'change_order_id' => $changeOrderId,
            'effects' => $effects,
        ];
    }

    /**
     * @param array<string, mixed> $metadata
     * @return array<string, mixed>|null
     */
    private function update(string $sql, string $changeOrderId, array $metadata): ?array
    {
        $payload = [
            'change_order_id' => $changeOrderId,
            'authority' => 'ChangeReleaseSideEffectService',
            'metadata' => $metadata,
        ];
        $params = [':change_order_id' => $changeOrderId];
        if (str_contains($sql, ':payload')) {
            $params[':payload'] = $this->json($payload);
        }
        if (str_contains($sql, ':idempotency_key')) {
            $params[':idempotency_key'] = hash('sha256', $changeOrderId . '|' . ($metadata['side_effect'] ?? 'side_effect'));
        }
        if (str_contains($sql, ':metadata')) {
            $params[':metadata'] = $this->json(['authority' => 'ChangeReleaseSideEffectService'] + $metadata);
        }
        $row = $this->db?->queryOne($sql, $params);

        return is_array($row) ? $row : null;
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }

    /**
     * @param array<string, mixed> $value
     */
    private function json(array $value): string
    {
        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($json)) {
            throw new RuntimeException('json_encode_failed');
        }
        return $json;
    }
}
