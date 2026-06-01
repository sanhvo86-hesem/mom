<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

use MOM\Database\Connection;
use Throwable;

final class ItemRevisionCommandHandler
{
    public function __construct(
        private readonly Connection $db,
    ) {}

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createItem(array $payload): array
    {
        $actorId = $this->actor($payload);
        $idempotencyKey = $this->text($payload['idempotency_key'] ?? '');

        return $this->db->transactional(function () use ($payload, $actorId, $idempotencyKey): array {
            $itemCode = $this->requiredAny($payload, ['item_code', 'item_ref', 'part_number'], 'item_code');
            $itemName = $this->requiredAny($payload, ['item_name', 'description', 'part_description'], 'item_name');
            $itemType = $this->text($payload['item_type'] ?? 'manufactured');

            $row = $this->db->insertReturning(
                "INSERT INTO item
                    (item_code, item_name, item_type, base_uom_code, product_family_code, status_code)
                 VALUES
                    (:item_code, :item_name, :item_type, NULLIF(:base_uom_code, ''), NULLIF(:product_family_code, ''), 'active')
                 ON CONFLICT (item_code) DO NOTHING
                 RETURNING item_id::text, item_code, item_name, item_type, base_uom_code, product_family_code, status_code",
                [
                    ':item_code' => $itemCode,
                    ':item_name' => $itemName,
                    ':item_type' => $itemType !== '' ? $itemType : 'manufactured',
                    ':base_uom_code' => $this->text($payload['base_uom_code'] ?? ''),
                    ':product_family_code' => $this->text($payload['product_family_code'] ?? ''),
                ]
            );

            if ($row === null) {
                $row = $this->db->queryOne(
                    'SELECT item_id::text, item_code, item_name, item_type, base_uom_code, product_family_code, status_code
                       FROM item
                      WHERE item_code = :item_code',
                    [':item_code' => $itemCode]
                );
                if (!is_array($row) || $row === []) {
                    throw new DomainCommandException('item_create_conflict', 'Item exists but could not be reloaded.', 409, [
                        'item_code' => $itemCode,
                    ]);
                }
            }

            $this->mirrorMasterDataStore('parts', $itemCode, 'active', [
                'part_number' => $itemCode,
                'part_description' => $itemName,
                'description' => $itemName,
                'item_id' => (string)($row['item_id'] ?? ''),
                'item_type' => (string)($row['item_type'] ?? ''),
                'base_uom_code' => (string)($row['base_uom_code'] ?? ''),
                'source_authority' => 'item',
            ], $actorId);

            $this->writeAuditAndOutbox(
                'master_data.item.created',
                'item',
                (string)($row['item_id'] ?? $itemCode),
                ['item' => $row],
                $actorId,
                $idempotencyKey
            );

            return $row;
        });
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createItemRevision(array $payload): array
    {
        $actorId = $this->actor($payload);
        $idempotencyKey = $this->text($payload['idempotency_key'] ?? '');

        return $this->db->transactional(function () use ($payload, $actorId, $idempotencyKey): array {
            $item = $this->resolveItem($payload);
            $revisionCode = $this->requiredAny($payload, ['revision_code', 'revision_ref', 'revision'], 'revision_code');
            $drawingReference = $this->text($payload['drawing_reference'] ?? '');

            $row = $this->db->insertReturning(
                "INSERT INTO item_revision
                    (item_id, revision_code, lifecycle_state, drawing_reference, effective_from, approval_state)
                 VALUES
                    (CAST(:item_id AS uuid), :revision_code, 'draft', NULLIF(:drawing_reference, ''), NOW(), 'draft')
                 ON CONFLICT (item_id, revision_code) DO NOTHING
                 RETURNING item_revision_id::text, item_id::text, revision_code, lifecycle_state, approval_state, drawing_reference, effective_from",
                [
                    ':item_id' => (string)$item['item_id'],
                    ':revision_code' => $revisionCode,
                    ':drawing_reference' => $drawingReference,
                ]
            );

            if ($row === null) {
                $row = $this->loadItemRevision((string)$item['item_id'], $revisionCode);
                if ($row === null) {
                    throw new DomainCommandException('item_revision_create_conflict', 'Item revision exists but could not be reloaded.', 409, [
                        'item_id' => (string)$item['item_id'],
                        'revision_code' => $revisionCode,
                    ]);
                }
            }

            $this->mirrorMasterDataStore('revisions', (string)($row['item_revision_id'] ?? ''), (string)($row['lifecycle_state'] ?? 'draft'), [
                'revision_id' => (string)($row['item_revision_id'] ?? ''),
                'item_id' => (string)$item['item_id'],
                'item_code' => (string)($item['item_code'] ?? ''),
                'revision_code' => $revisionCode,
                'drawing_reference' => $drawingReference,
                'status' => (string)($row['lifecycle_state'] ?? 'draft'),
                'source_authority' => 'item_revision',
            ], $actorId);

            $this->writeAuditAndOutbox(
                'master_data.item_revision.created',
                'item_revision',
                (string)($row['item_revision_id'] ?? ''),
                ['item' => $item, 'revision' => $row],
                $actorId,
                $idempotencyKey
            );

            return $row;
        });
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function releaseItemRevision(array $payload): array
    {
        $actorId = $this->actor($payload);
        $idempotencyKey = $this->text($payload['idempotency_key'] ?? '');

        return $this->db->transactional(function () use ($payload, $actorId, $idempotencyKey): array {
            $revision = $this->resolveItemRevision($payload);
            $state = strtolower($this->text($revision['lifecycle_state'] ?? ''));
            if ($state === 'released') {
                throw new DomainCommandException('item_revision_already_released', 'Item revision is already released.', 409, [
                    'item_revision_id' => (string)($revision['item_revision_id'] ?? ''),
                ]);
            }
            if (in_array($state, ['superseded', 'obsolete'], true)) {
                throw new DomainCommandException('item_revision_not_releasable', 'Item revision cannot be released from its current lifecycle state.', 409, [
                    'item_revision_id' => (string)($revision['item_revision_id'] ?? ''),
                    'lifecycle_state' => $state,
                ]);
            }

            $row = $this->db->insertReturning(
                "UPDATE item_revision
                    SET lifecycle_state = 'released',
                        approval_state = 'approved'
                  WHERE item_revision_id = CAST(:item_revision_id AS uuid)
                    AND lifecycle_state NOT IN ('released','superseded','obsolete')
                 RETURNING item_revision_id::text, item_id::text, revision_code, lifecycle_state, approval_state, drawing_reference, effective_from",
                [':item_revision_id' => (string)$revision['item_revision_id']]
            );

            if ($row === null) {
                throw new DomainCommandException('item_revision_release_failed', 'Item revision release update did not affect a releasable row.', 409, [
                    'item_revision_id' => (string)$revision['item_revision_id'],
                ]);
            }

            $releaseHash = $this->sha256([
                'item_revision_id' => (string)$row['item_revision_id'],
                'item_id' => (string)$row['item_id'],
                'revision_code' => (string)$row['revision_code'],
                'lifecycle_state' => (string)$row['lifecycle_state'],
                'approval_state' => (string)$row['approval_state'],
            ]);
            $row['release_record_hash_sha256'] = $releaseHash;

            $this->mirrorMasterDataStore('revisions', (string)$row['item_revision_id'], 'released', [
                'revision_id' => (string)$row['item_revision_id'],
                'item_id' => (string)$row['item_id'],
                'revision_code' => (string)$row['revision_code'],
                'status' => 'released',
                'release_record_hash_sha256' => $releaseHash,
                'source_authority' => 'item_revision',
            ], $actorId);

            $this->writeAuditAndOutbox(
                'master_data.item_revision.released',
                'item_revision',
                (string)$row['item_revision_id'],
                ['revision' => $row],
                $actorId,
                $idempotencyKey
            );

            return $row;
        });
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    private function resolveItem(array $payload): array
    {
        $itemId = $this->text($payload['item_id'] ?? '');
        if ($itemId !== '') {
            $row = $this->db->queryOne(
                'SELECT item_id::text, item_code, item_name, item_type, base_uom_code, status_code FROM item WHERE item_id = CAST(:item_id AS uuid)',
                [':item_id' => $itemId]
            );
            if (is_array($row) && $row !== []) {
                return $row;
            }
        }

        $itemCode = $this->requiredAny($payload, ['item_code', 'item_ref', 'part_number'], 'item_code');
        $row = $this->db->queryOne(
            'SELECT item_id::text, item_code, item_name, item_type, base_uom_code, status_code FROM item WHERE item_code = :item_code',
            [':item_code' => $itemCode]
        );
        if (is_array($row) && $row !== []) {
            return $row;
        }

        throw new DomainCommandException('item_not_found', 'Item revision command requires an existing item authority row.', 404, [
            'item_code' => $itemCode,
        ]);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    private function resolveItemRevision(array $payload): array
    {
        $revisionId = $this->text($payload['item_revision_id'] ?? $payload['revision_id'] ?? '');
        if ($revisionId !== '') {
            $row = $this->db->queryOne(
                'SELECT item_revision_id::text, item_id::text, revision_code, lifecycle_state, approval_state, drawing_reference, effective_from
                   FROM item_revision
                  WHERE item_revision_id = CAST(:item_revision_id AS uuid)',
                [':item_revision_id' => $revisionId]
            );
            if (is_array($row) && $row !== []) {
                return $row;
            }
        }

        $item = $this->resolveItem($payload);
        $revisionCode = $this->requiredAny($payload, ['revision_code', 'revision_ref', 'revision'], 'revision_code');
        $row = $this->loadItemRevision((string)$item['item_id'], $revisionCode);
        if ($row !== null) {
            return $row;
        }

        throw new DomainCommandException('item_revision_not_found', 'Item revision was not found.', 404, [
            'item_id' => (string)$item['item_id'],
            'revision_code' => $revisionCode,
        ]);
    }

    private function loadItemRevision(string $itemId, string $revisionCode): ?array
    {
        $row = $this->db->queryOne(
            'SELECT item_revision_id::text, item_id::text, revision_code, lifecycle_state, approval_state, drawing_reference, effective_from
               FROM item_revision
              WHERE item_id = CAST(:item_id AS uuid)
                AND revision_code = :revision_code',
            [':item_id' => $itemId, ':revision_code' => $revisionCode]
        );

        return is_array($row) && $row !== [] ? $row : null;
    }

    /**
     * @param array<string,mixed> $data
     */
    private function mirrorMasterDataStore(string $entityType, string $entityId, string $status, array $data, string $actorId): void
    {
        if ($entityId === '') {
            return;
        }

        $this->db->execute(
            "INSERT INTO master_data_store (entity_type, entity_id, status, data, created_by, updated_by, updated_at)
             VALUES (:entity_type, :entity_id, :status, CAST(:data AS jsonb), :created_by, :updated_by, NOW())
             ON CONFLICT (entity_type, entity_id) DO UPDATE SET
                 status = EXCLUDED.status,
                 data = EXCLUDED.data,
                 updated_by = EXCLUDED.updated_by,
                 updated_at = NOW()",
            [
                ':entity_type' => $entityType,
                ':entity_id' => $entityId,
                ':status' => $status,
                ':data' => $this->json($data),
                ':created_by' => $actorId,
                ':updated_by' => $actorId,
            ]
        );
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function writeAuditAndOutbox(
        string $eventType,
        string $aggregateType,
        string $aggregateId,
        array $payload,
        string $actorId,
        string $idempotencyKey
    ): void {
        $bodyJson = $this->json(['payload' => $payload, 'authority' => self::class]);
        $this->db->execute(
            'INSERT INTO audit_events (event_type, aggregate_type, aggregate_id, actor_name, payload, metadata, recorded_at)
             VALUES (:event_type, :aggregate_type, :aggregate_id, :actor_name, CAST(:payload AS jsonb), CAST(:metadata AS jsonb), now())',
            [
                ':event_type' => $eventType,
                ':aggregate_type' => $aggregateType,
                ':aggregate_id' => $aggregateId,
                ':actor_name' => $actorId,
                ':payload' => $bodyJson,
                ':metadata' => $this->json(['authority' => self::class]),
            ]
        );
        $this->db->execute(
            "INSERT INTO domain_outbox_events
                (aggregate_type, aggregate_id, event_type, payload, idempotency_key, payload_schema_version)
             VALUES
                (:aggregate_type, :aggregate_id, :event_type, CAST(:payload AS jsonb), :idempotency_key, 'item_revision_command.v1')
             ON CONFLICT (aggregate_type, aggregate_id, event_type, idempotency_key) WHERE idempotency_key IS NOT NULL
             DO NOTHING",
            [
                ':aggregate_type' => $aggregateType,
                ':aggregate_id' => $aggregateId,
                ':event_type' => $eventType,
                ':payload' => $bodyJson,
                ':idempotency_key' => $idempotencyKey !== '' ? $idempotencyKey : null,
            ]
        );
    }

    /**
     * @param array<string,mixed> $payload
     * @param list<string> $fields
     */
    private function requiredAny(array $payload, array $fields, string $label): string
    {
        foreach ($fields as $field) {
            $text = $this->text($payload[$field] ?? '');
            if ($text !== '') {
                return $text;
            }
        }

        throw new DomainCommandException($label . '_required', $label . ' is required.', 400, [
            'accepted_fields' => $fields,
        ]);
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function actor(array $payload): string
    {
        return $this->requiredAny($payload, ['actor_id', 'actor_ref', 'updated_by'], 'actor_id');
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }

    private function json(mixed $value): string
    {
        try {
            return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            throw new DomainCommandException('item_revision_command_json_failed', 'Item revision command payload cannot be encoded.', 500, [], $e);
        }
    }

    private function sha256(mixed $value): string
    {
        return hash('sha256', $this->json($value));
    }
}
