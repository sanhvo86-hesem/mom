<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

use Throwable;

final class CommandRecordHasher
{
    /**
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $payload
     */
    public function hash(array $entry, array $payload): string
    {
        return hash('sha256', $this->json([
            'command_name' => (string)($entry['command_name'] ?? ''),
            'root' => (string)($entry['root'] ?? ''),
            'payload' => $this->sortRecursive($this->canonicalPayload($payload)),
        ]));
    }

    /**
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $result
     */
    public function recordId(array $entry, array $payload, array $result = []): string
    {
        unset($entry);
        foreach ([
            'package_id',
            'work_order_ref',
            'job_order_ref',
            'sales_order_ref',
            'item_revision_id',
            'item_id',
            'item_ref',
            'hold_id',
            'inspection_result_id',
            'ledger_transaction_id',
            'operation_ref',
            'command_business_key',
        ] as $field) {
            $value = trim((string)($result[$field] ?? $payload[$field] ?? ''));
            if ($value !== '') {
                return $value;
            }
        }

        return hash('sha256', $this->json($this->sortRecursive($this->canonicalPayload($payload))));
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    private function canonicalPayload(array $payload): array
    {
        foreach ([
            'signature_evidence',
            'electronic_signature',
            'signature',
            'reauth_at',
            'reauthenticated_at',
            'reauth_evidence',
            'idempotency_key',
        ] as $field) {
            unset($payload[$field]);
        }

        return $payload;
    }

    private function sortRecursive(mixed $value): mixed
    {
        if (!is_array($value)) {
            return $value;
        }
        if (array_is_list($value)) {
            return array_map(fn (mixed $item): mixed => $this->sortRecursive($item), $value);
        }
        ksort($value);
        foreach ($value as $key => $item) {
            $value[$key] = $this->sortRecursive($item);
        }

        return $value;
    }

    private function json(mixed $value): string
    {
        try {
            return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            throw new DomainCommandException('command_record_hash_failed', 'Command record hash payload cannot be encoded.', 400, [], $e);
        }
    }
}
