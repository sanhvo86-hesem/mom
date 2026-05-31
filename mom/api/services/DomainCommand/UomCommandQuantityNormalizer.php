<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

use MOM\Api\Services\Uom\UomException;
use MOM\Api\Services\Uom\UomRuntimeAuthorityService;
use MOM\Database\Connection;
use Throwable;

/**
 * Direct command-stack adapter for the UOM runtime authority.
 *
 * This class intentionally depends on UomRuntimeAuthorityService, not the old
 * MDA compatibility bridge. It normalizes governed command quantities and
 * records immutable MEASVAL lineage before the domain handler writes execution
 * or inventory truth.
 */
final class UomCommandQuantityNormalizer
{
    public function __construct(
        private readonly Connection $db,
        private readonly ?\Redis $redis = null,
        private readonly ?UomRuntimeAuthorityService $authority = null,
    ) {}

    /**
     * @return array<string,array<string,mixed>>
     */
    public function commandPolicyMatrix(): array
    {
        return $this->authority()->commandPolicyMatrix();
    }

    /**
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $context
     * @return array<string,mixed>
     */
    public function normalizeAndRecord(
        string $commandName,
        array $payload,
        string $actorId,
        string $idempotencyKey,
        string $quantityRole = 'primary',
        array $context = []
    ): array {
        if (!array_key_exists($commandName, $this->commandPolicyMatrix())) {
            throw new DomainCommandException(
                'uom_command_policy_not_registered',
                "Command '{$commandName}' has no UOM runtime authority policy.",
                409,
                ['command_name' => $commandName]
            );
        }

        try {
            $normalized = $this->authority()->normalizeCommandQuantity(
                $commandName,
                $payload,
                array_merge($context, [
                    'actor_id' => $actorId,
                    'domain_command' => $commandName,
                    'idempotency_key' => $idempotencyKey,
                    'quantity_role' => $quantityRole,
                    'trace_id' => (string)($context['trace_id'] ?? $payload['trace_id'] ?? $payload['correlation_id'] ?? $idempotencyKey),
                ])
            );
        } catch (UomException $e) {
            throw new DomainCommandException(
                'uom_authority_resolution_failed',
                'UOM authority could not normalize the governed command quantity.',
                $e->getHttpStatus(),
                [
                    'command_name' => $commandName,
                    'quantity_role' => $quantityRole,
                    'uom_problem_code' => $e->problemCode,
                    'operator_message' => 'Resolve UOM policy, alias, conversion rule, effectivity, and dimensional compatibility before retrying.',
                ],
                $e
            );
        } catch (Throwable $e) {
            throw new DomainCommandException(
                'uom_authority_unavailable',
                'UOM authority is unavailable for governed command quantity normalization.',
                500,
                ['command_name' => $commandName, 'quantity_role' => $quantityRole],
                $e
            );
        }

        $record = $this->recordMeasurement($commandName, $payload, $normalized, $actorId, $idempotencyKey, $quantityRole);
        $this->writeAuditAndOutbox($commandName, $normalized, $record, $actorId, $idempotencyKey, $quantityRole);

        return $normalized + [
            'measurement_id' => (string)($record['measurement_id'] ?? ''),
            'quantity_role' => $quantityRole,
            'converted_magnitude' => $this->convertedMagnitude($normalized),
            'target_unit_code' => $this->targetUnit($normalized),
            'measval_hash_sha256' => $this->measvalHash($normalized),
        ];
    }

    /**
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $normalized
     * @return array<string,mixed>
     */
    private function recordMeasurement(
        string $commandName,
        array $payload,
        array $normalized,
        string $actorId,
        string $idempotencyKey,
        string $quantityRole
    ): array {
        $input = is_array($normalized['input'] ?? null) ? (array)$normalized['input'] : [];
        $target = is_array($normalized['target'] ?? null) ? (array)$normalized['target'] : [];
        $conversion = is_array($normalized['conversion'] ?? null) ? (array)$normalized['conversion'] : [];
        $payloadJson = $this->json($normalized);
        $converted = $this->convertedMagnitude($normalized);
        $targetUnit = $this->targetUnit($normalized);
        $measvalHash = $this->measvalHash($normalized);
        $sourceAggregateId = $this->firstText($payload, ['work_order_ref', 'job_number', 'wo_number', 'inspection_id', 'item_id', 'command_business_key']) ?: $idempotencyKey;

        try {
            $row = $this->db->queryOne(
                "WITH inserted AS (
                    INSERT INTO domain_command_uom_measurement
                        (command_name, idempotency_key, quantity_role, actor_id, item_id, work_order_ref,
                         operation_ref, source_aggregate_type, source_aggregate_id, slot, context_code,
                         input_magnitude, input_unit_code, input_raw_unit, target_unit_code, converted_magnitude,
                         conversion_result_hash_sha256, measval_hash_sha256, uom_authority, conversion_payload, metadata)
                    VALUES
                        (:command_name, :idempotency_key, :quantity_role, :actor_id, :item_id, :work_order_ref,
                         :operation_ref, :source_aggregate_type, :source_aggregate_id, :slot, :context_code,
                         :input_magnitude, :input_unit_code, :input_raw_unit, :target_unit_code, :converted_magnitude,
                         :conversion_result_hash_sha256, :measval_hash_sha256, :uom_authority, CAST(:conversion_payload AS jsonb), CAST(:metadata AS jsonb))
                    ON CONFLICT (command_name, idempotency_key, quantity_role) DO NOTHING
                    RETURNING *
                 )
                 SELECT * FROM inserted
                 UNION ALL
                 SELECT * FROM domain_command_uom_measurement
                  WHERE command_name = :command_name
                    AND idempotency_key = :idempotency_key
                    AND quantity_role = :quantity_role
                 LIMIT 1",
                [
                    ':command_name' => $commandName,
                    ':idempotency_key' => $idempotencyKey,
                    ':quantity_role' => $quantityRole,
                    ':actor_id' => $actorId,
                    ':item_id' => $this->firstText($payload, ['item_id', 'part_number', 'material_id', 'sku']),
                    ':work_order_ref' => $this->firstNullableText($payload, ['work_order_ref', 'wo_number', 'job_number']),
                    ':operation_ref' => $this->firstNullableText($payload, ['operation_ref', 'operation_seq']),
                    ':source_aggregate_type' => (string)($payload['source_aggregate_type'] ?? 'domain_command'),
                    ':source_aggregate_id' => $sourceAggregateId,
                    ':slot' => isset($normalized['slot']) ? (string)$normalized['slot'] : null,
                    ':context_code' => isset($normalized['context_code']) ? (string)$normalized['context_code'] : null,
                    ':input_magnitude' => (string)($input['magnitude'] ?? ''),
                    ':input_unit_code' => (string)($input['unit_code'] ?? ''),
                    ':input_raw_unit' => isset($input['raw_unit']) ? (string)$input['raw_unit'] : null,
                    ':target_unit_code' => $targetUnit,
                    ':converted_magnitude' => $converted,
                    ':conversion_result_hash_sha256' => hash('sha256', $converted . '|' . $targetUnit . '|' . $payloadJson),
                    ':measval_hash_sha256' => $measvalHash,
                    ':uom_authority' => (string)($normalized['authority'] ?? UomRuntimeAuthorityService::AUTHORITY),
                    ':conversion_payload' => $this->json($conversion),
                    ':metadata' => $this->json([
                        'authority' => self::class,
                        'legacy_bridge_used' => false,
                    ]),
                ]
            );
        } catch (Throwable $e) {
            throw new DomainCommandException(
                'uom_measurement_record_write_failed',
                'UOM command measurement evidence could not be written.',
                500,
                ['command_name' => $commandName, 'quantity_role' => $quantityRole],
                $e
            );
        }

        return is_array($row) ? $row : [];
    }

    /**
     * @param array<string,mixed> $normalized
     * @param array<string,mixed> $record
     */
    private function writeAuditAndOutbox(
        string $commandName,
        array $normalized,
        array $record,
        string $actorId,
        string $idempotencyKey,
        string $quantityRole
    ): void {
        $aggregateId = (string)($record['measurement_id'] ?? $idempotencyKey);
        $body = [
            'command_name' => $commandName,
            'quantity_role' => $quantityRole,
            'measurement_id' => $aggregateId,
            'normalized' => $normalized,
        ];
        $bodyJson = $this->json($body);

        try {
            $this->db->execute(
                "INSERT INTO audit_events (event_type, aggregate_type, aggregate_id, actor_name, payload, metadata, recorded_at)
                 VALUES ('uom.command_quantity_normalized', 'domain_command_uom_measurement', :aggregate_id, :actor_name,
                         CAST(:payload AS jsonb), CAST(:metadata AS jsonb), now())",
                [
                    ':aggregate_id' => $aggregateId,
                    ':actor_name' => $actorId,
                    ':payload' => $bodyJson,
                    ':metadata' => $this->json(['authority' => self::class, 'command_name' => $commandName]),
                ]
            );

            $this->db->execute(
                "INSERT INTO domain_outbox_events
                    (aggregate_type, aggregate_id, event_type, payload, idempotency_key, payload_schema_version)
                 VALUES
                    ('domain_command_uom_measurement', :aggregate_id, 'UomCommandQuantityNormalized',
                     CAST(:payload AS jsonb), :idempotency_key, 'uom.command_quantity_normalized.v1')
                 ON CONFLICT (aggregate_type, aggregate_id, event_type, idempotency_key) WHERE idempotency_key IS NOT NULL
                 DO NOTHING",
                [
                    ':aggregate_id' => $aggregateId,
                    ':payload' => $bodyJson,
                    ':idempotency_key' => $idempotencyKey . ':' . $quantityRole,
                ]
            );
        } catch (Throwable $e) {
            throw new DomainCommandException(
                'uom_measurement_outbox_write_failed',
                'UOM command measurement audit/outbox evidence could not be written.',
                500,
                ['command_name' => $commandName, 'quantity_role' => $quantityRole],
                $e
            );
        }
    }

    /**
     * @param array<string,mixed> $normalized
     */
    private function convertedMagnitude(array $normalized): string
    {
        $conversion = is_array($normalized['conversion'] ?? null) ? (array)$normalized['conversion'] : [];
        return (string)($conversion['result'] ?? '');
    }

    /**
     * @param array<string,mixed> $normalized
     */
    private function targetUnit(array $normalized): string
    {
        $target = is_array($normalized['target'] ?? null) ? (array)$normalized['target'] : [];
        return (string)($target['unit_code'] ?? '');
    }

    /**
     * @param array<string,mixed> $normalized
     */
    private function measvalHash(array $normalized): string
    {
        $conversion = is_array($normalized['conversion'] ?? null) ? (array)$normalized['conversion'] : [];
        $measval = is_array($conversion['measval'] ?? null) ? (array)$conversion['measval'] : [];
        $thread = is_array($measval['digital_thread'] ?? null) ? (array)$measval['digital_thread'] : [];
        $hash = strtolower(trim((string)($thread['audit_hash'] ?? '')));
        return preg_match('/^[a-f0-9]{64}$/', $hash) === 1 ? $hash : hash('sha256', $this->json($normalized));
    }

    /**
     * @param array<string,mixed> $payload
     * @param list<string> $keys
     */
    private function firstText(array $payload, array $keys): string
    {
        foreach ($keys as $key) {
            $value = trim((string)($payload[$key] ?? ''));
            if ($value !== '') {
                return $value;
            }
        }
        return '';
    }

    /**
     * @param array<string,mixed> $payload
     * @param list<string> $keys
     */
    private function firstNullableText(array $payload, array $keys): ?string
    {
        $value = $this->firstText($payload, $keys);
        return $value === '' ? null : $value;
    }

    private function authority(): UomRuntimeAuthorityService
    {
        return $this->authority ?? new UomRuntimeAuthorityService($this->db, $this->redis);
    }

    private function json(mixed $value): string
    {
        try {
            return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            throw new DomainCommandException('uom_runtime_json_failed', 'UOM runtime payload cannot be encoded.', 500, [], $e);
        }
    }
}
