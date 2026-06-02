<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

use MOM\Database\Connection;
use Throwable;

final class SoDPolicy
{
    public function __construct(private readonly ?Connection $db = null) {}

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

        if (array_key_exists('sod_exception_approved', $payload) || array_key_exists('sod_exception_approved', $envelope)) {
            return $this->deny('sod_payload_exception_untrusted', 'Payload-supplied SoD exception approval is not trusted.', [
                'command_name' => $commandName,
            ]);
        }

        $exceptionId = trim((string)($payload['sod_exception_id'] ?? $envelope['sod_exception_id'] ?? ''));
        if ($exceptionId === '') {
            return $this->deny('sod_violation', 'Segregation-of-duties policy forbids originator self-approval/release.', [
                'command_name' => $commandName,
            ]);
        }

        return $this->evaluateServerException($exceptionId, $commandName, $actor, $originator, $payload, $envelope);
    }

    /**
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $envelope
     * @return array{allowed:bool,code:string,message:string,details:array<string,mixed>}
     */
    private function evaluateServerException(
        string $exceptionId,
        string $commandName,
        string $actor,
        string $originator,
        array $payload,
        array $envelope
    ): array {
        if ($this->db === null) {
            return $this->deny('sod_exception_server_lookup_required', 'SoD exception must be verified server-side.', [
                'exception_id' => $exceptionId,
            ]);
        }

        try {
            $row = $this->db->queryOne(
                "SELECT exception_id, command_name, subject_type, subject_ref, requested_by, approved_by,
                        approval_signature_event_id, reason, scope_site_id, org_id, valid_from, valid_until,
                        status, consumed_at, command_id, one_time
                   FROM domain_command_sod_exception
                  WHERE exception_id = :exception_id",
                [':exception_id' => $exceptionId]
            );
        } catch (Throwable) {
            return $this->deny('sod_exception_lookup_failed', 'SoD exception could not be verified server-side.', [
                'exception_id' => $exceptionId,
            ]);
        }

        if (!is_array($row) || $row === []) {
            return $this->deny('sod_exception_not_found', 'SoD exception was not found.', [
                'exception_id' => $exceptionId,
            ]);
        }
        if ((string)($row['status'] ?? '') !== 'approved') {
            return $this->deny('sod_exception_not_approved', 'SoD exception is not approved.', [
                'exception_id' => $exceptionId,
            ]);
        }
        if (!hash_equals($commandName, trim((string)($row['command_name'] ?? '')))) {
            return $this->deny('sod_exception_scope_mismatch', 'SoD exception is not scoped to this command.', [
                'exception_id' => $exceptionId,
                'command_name' => $commandName,
            ]);
        }
        $approvedBy = trim((string)($row['approved_by'] ?? ''));
        if ($approvedBy === '' || hash_equals($approvedBy, $originator) || hash_equals($approvedBy, $actor)) {
            return $this->deny('sod_exception_approver_invalid', 'SoD exception approver must be server-recorded and independent.', [
                'exception_id' => $exceptionId,
            ]);
        }
        if (trim((string)($row['approval_signature_event_id'] ?? '')) === '') {
            return $this->deny('sod_exception_signature_missing', 'SoD exception approval must be signature-linked.', [
                'exception_id' => $exceptionId,
            ]);
        }
        if (trim((string)($row['consumed_at'] ?? '')) !== '') {
            return $this->deny('sod_exception_consumed', 'SoD exception has already been consumed.', [
                'exception_id' => $exceptionId,
            ]);
        }
        if (!$this->withinValidityWindow($row)) {
            return $this->deny('sod_exception_expired', 'SoD exception is not currently active.', [
                'exception_id' => $exceptionId,
            ]);
        }
        if (!$this->matchesSubjectScope($row, $payload)) {
            return $this->deny('sod_exception_scope_mismatch', 'SoD exception is not scoped to this object/site.', [
                'exception_id' => $exceptionId,
            ]);
        }

        if (filter_var($row['one_time'] ?? true, FILTER_VALIDATE_BOOLEAN)) {
            try {
                $this->db->execute(
                    "UPDATE domain_command_sod_exception
                        SET consumed_at = now(), command_id = :command_id
                      WHERE exception_id = :exception_id AND consumed_at IS NULL",
                    [
                        ':exception_id' => $exceptionId,
                        ':command_id' => hash('sha256', $commandName . '|' . (string)($envelope['idempotency_key'] ?? '')),
                    ]
                );
            } catch (Throwable) {
                return $this->deny('sod_exception_consume_failed', 'SoD exception could not be consumed.', [
                    'exception_id' => $exceptionId,
                ]);
            }
        }

        return $this->allow();
    }

    /**
     * @param array<string,mixed> $row
     */
    private function withinValidityWindow(array $row): bool
    {
        $now = time();
        $from = strtotime((string)($row['valid_from'] ?? ''));
        $until = strtotime((string)($row['valid_until'] ?? ''));

        return $from !== false && $until !== false && $from <= $now && $until > $now;
    }

    /**
     * @param array<string,mixed> $row
     * @param array<string,mixed> $payload
     */
    private function matchesSubjectScope(array $row, array $payload): bool
    {
        $subjectType = trim((string)($row['subject_type'] ?? ''));
        $subjectRef = trim((string)($row['subject_ref'] ?? ''));
        if ($subjectType !== '') {
            $payloadSubjectType = trim((string)($payload['subject_type'] ?? $payload['root_type'] ?? ''));
            if ($payloadSubjectType !== '' && !hash_equals($subjectType, $payloadSubjectType)) {
                return false;
            }
        }
        if ($subjectRef !== '') {
            $payloadRefs = array_values(array_filter(array_map(
                static fn (mixed $value): string => trim((string)$value),
                [
                    $payload['subject_ref'] ?? null,
                    $payload['package_id'] ?? null,
                    $payload['item_id'] ?? null,
                    $payload['item_ref'] ?? null,
                    $payload['hold_id'] ?? null,
                    $payload['work_order_ref'] ?? null,
                    $payload['command_business_key'] ?? null,
                ]
            )));
            if ($payloadRefs !== [] && !in_array($subjectRef, $payloadRefs, true)) {
                return false;
            }
        }
        $siteId = trim((string)($row['scope_site_id'] ?? ''));
        if ($siteId !== '') {
            $payloadSite = trim((string)($payload['site_id'] ?? $payload['site_ref'] ?? $payload['org_site_id'] ?? ''));
            if ($payloadSite !== '' && !hash_equals($siteId, $payloadSite)) {
                return false;
            }
        }

        return true;
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
