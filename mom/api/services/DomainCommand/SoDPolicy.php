<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

final class SoDPolicy
{
    /**
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $envelope
     * @param array<string,mixed> $payload
     * @return array{allowed:bool,code:string,message:string,details:array<string,mixed>}
     */
    public function evaluate(array $entry, array $envelope, array $payload): array
    {
        if (($entry['regulated_action'] ?? false) !== true) {
            return $this->allow();
        }

        $commandName = (string)($entry['command_name'] ?? $envelope['command_name'] ?? '');
        if (!preg_match('/(Approve|Release|Sign|Post)/', $commandName)) {
            return $this->allow();
        }

        $actor = trim((string)($envelope['actor_id'] ?? $envelope['actor_ref'] ?? ''));
        $originator = trim((string)($payload['created_by'] ?? $payload['originator_id'] ?? $payload['requested_by'] ?? ''));
        if ($actor === '' || $originator === '' || !hash_equals($actor, $originator)) {
            return $this->allow();
        }

        $exceptionId = trim((string)($payload['sod_exception_id'] ?? $envelope['sod_exception_id'] ?? ''));
        $approved = filter_var($payload['sod_exception_approved'] ?? $envelope['sod_exception_approved'] ?? false, FILTER_VALIDATE_BOOLEAN);
        if ($exceptionId !== '' && $approved) {
            return $this->allow();
        }

        return $this->deny('sod_violation', 'Segregation-of-duties policy forbids originator self-approval/release.', [
            'command_name' => $commandName,
        ]);
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
