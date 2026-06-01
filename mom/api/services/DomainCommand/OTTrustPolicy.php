<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

final class OTTrustPolicy
{
    /**
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $envelope
     * @param array<string,mixed> $payload
     * @return array{allowed:bool,code:string,message:string,details:array<string,mixed>}
     */
    public function evaluate(array $entry, array $envelope, array $payload): array
    {
        unset($entry);
        if (!$this->isOTSource($envelope, $payload)) {
            return $this->allow();
        }

        $trust = is_array($envelope['ot_trust'] ?? null) ? (array)$envelope['ot_trust'] : [];
        if ($trust === [] && is_array($payload['ot_trust'] ?? null)) {
            $trust = (array)$payload['ot_trust'];
        }

        $trustedAdapter = filter_var($trust['trusted_adapter'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $mappingId = trim((string)($trust['mapping_id'] ?? ''));
        $capturedAt = trim((string)($trust['captured_at'] ?? $trust['timestamp'] ?? ''));
        $replayNonce = trim((string)($trust['replay_nonce'] ?? $trust['nonce'] ?? ''));

        if (!$trustedAdapter || $mappingId === '' || $capturedAt === '' || $replayNonce === '') {
            return $this->deny('ot_trust_required', 'OT-originated command requires trusted adapter, mapping, timestamp, and replay nonce.', [
                'required_fields' => ['trusted_adapter', 'mapping_id', 'captured_at', 'replay_nonce'],
            ]);
        }

        return $this->allow();
    }

    /**
     * @param array<string,mixed> $envelope
     * @param array<string,mixed> $payload
     */
    private function isOTSource(array $envelope, array $payload): bool
    {
        $sourceType = strtolower(trim((string)($envelope['source_type'] ?? $payload['source_type'] ?? '')));
        $sourceSystem = strtolower(trim((string)($envelope['source_system'] ?? $payload['source_system'] ?? '')));

        return $sourceType === 'ot'
            || str_contains($sourceSystem, 'mtconnect')
            || str_contains($sourceSystem, 'opcua')
            || str_contains($sourceSystem, 'opc-ua')
            || str_contains($sourceSystem, 'ot-')
            || isset($payload['ot_event']);
    }

    /**
     * @return array{allowed:bool,code:string,message:string,details:array<string,mixed>}
     */
    private function allow(): array
    {
        return ['allowed' => true, 'code' => 'allowed', 'message' => 'Allowed.', 'details' => []];
    }

    /**
     * @param array<string,mixed> $details
     * @return array{allowed:bool,code:string,message:string,details:array<string,mixed>}
     */
    private function deny(string $code, string $message, array $details = []): array
    {
        return ['allowed' => false, 'code' => $code, 'message' => $message, 'details' => $details];
    }
}
