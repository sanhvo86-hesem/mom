<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

use DateTimeImmutable;
use Throwable;

final class PrivilegedReauthPolicy
{
    private const MAX_AGE_SECONDS = 300;

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

        $evidence = is_array($envelope['reauth_evidence'] ?? null) ? (array)$envelope['reauth_evidence'] : [];
        $reauthAt = trim((string)(
            $envelope['reauth_at']
            ?? $envelope['reauthenticated_at']
            ?? $payload['reauth_at']
            ?? $evidence['reauth_at']
            ?? ''
        ));
        if ($reauthAt === '') {
            return $this->deny('reauth_required', 'Privileged governed command requires recent re-authentication.', [
                'max_age_seconds' => self::MAX_AGE_SECONDS,
            ]);
        }

        if ($evidence !== []) {
            $verified = filter_var($evidence['verified'] ?? $envelope['reauth_verified'] ?? false, FILTER_VALIDATE_BOOLEAN);
            if (!$verified) {
                return $this->deny('reauth_required', 'Re-authentication evidence is not verified.');
            }
        }

        try {
            $timestamp = new DateTimeImmutable($reauthAt);
        } catch (Throwable) {
            return $this->deny('reauth_required', 'Re-authentication timestamp is invalid.');
        }

        if ($timestamp->getTimestamp() > (time() + 30)) {
            return $this->deny('reauth_required', 'Re-authentication timestamp is in the future.');
        }

        if ((time() - $timestamp->getTimestamp()) > self::MAX_AGE_SECONDS) {
            return $this->deny('reauth_required', 'Re-authentication is stale.', [
                'max_age_seconds' => self::MAX_AGE_SECONDS,
            ]);
        }

        return $this->allow();
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
