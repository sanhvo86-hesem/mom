<?php

declare(strict_types=1);

namespace MOM\Services;

use DateTimeImmutable;
use RuntimeException;

/**
 * Governed operational overrides with typed reasons, expiry, and signature evidence.
 *
 * This moves runtime waivers away from ad-hoc per-feature files and into a
 * first-class controlled object that can be audited, expired, and revoked.
 */
final class OperationalOverrideService
{
    private string $dataDir;
    private string $confDir;
    private string $storePath;
    private string $policyPath;

    public function __construct(string $dataDir, string $confDir)
    {
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->confDir = rtrim(str_replace('\\', '/', $confDir), '/');
        $this->storePath = $this->dataDir . '/governance/operational_overrides.json';
        $this->policyPath = $this->confDir . '/operational_override_policy.json';
    }

    /**
     * @return array<string, mixed>
     */
    public function getPolicy(): array
    {
        $loaded = $this->readJson($this->policyPath);
        if (is_array($loaded) && isset($loaded['override_types']) && is_array($loaded['override_types'])) {
            return $loaded;
        }

        return [
            'override_types' => [],
            'reason_codes' => [],
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function createOverride(array $input): array
    {
        $policy = $this->getPolicy();
        $overrideType = trim((string)($input['override_type'] ?? ''));
        $typePolicy = $this->overrideTypePolicy($overrideType, $policy);

        $subjectType = trim((string)($input['subject_type'] ?? ($typePolicy['subject_type'] ?? '')));
        $subjectId = trim((string)($input['subject_id'] ?? ''));
        $controlFamily = trim((string)($input['control_family'] ?? ($typePolicy['control_family'] ?? '')));
        $controlCode = trim((string)($input['control_code'] ?? ''));
        $reasonCode = trim((string)($input['reason_code'] ?? ''));
        $reasonText = trim((string)($input['reason_text'] ?? ''));
        $requestedBy = trim((string)($input['requested_by'] ?? $input['approved_by'] ?? ''));
        $requestedRole = trim((string)($input['requested_role'] ?? $input['approved_role'] ?? ''));
        $approvedBy = trim((string)($input['approved_by'] ?? ''));
        $approvedRole = trim((string)($input['approved_role'] ?? ''));
        $approvalReference = trim((string)($input['approval_reference'] ?? ''));

        if ($overrideType === '' || $subjectType === '' || $subjectId === '' || $controlFamily === '' || $controlCode === '') {
            throw new RuntimeException('Operational override descriptor is incomplete.');
        }
        if ($reasonCode === '' || $reasonText === '') {
            throw new RuntimeException('Operational override requires a typed reason code and reason text.');
        }
        if ($approvedBy === '' || $approvedRole === '') {
            throw new RuntimeException('Operational override requires an approving user and role.');
        }

        $allowedRoles = is_array($typePolicy['allowed_approver_roles'] ?? null) ? $typePolicy['allowed_approver_roles'] : [];
        if (!empty($allowedRoles) && !in_array($approvedRole, $allowedRoles, true)) {
            throw new RuntimeException('Approver role is not authorized for this override type.');
        }

        $reasonCatalog = is_array($policy['reason_codes'] ?? null) ? $policy['reason_codes'] : [];
        if (!array_key_exists($reasonCode, $reasonCatalog)) {
            throw new RuntimeException('Unknown override reason code.');
        }

        $typeReasonCodes = is_array($typePolicy['allowed_reason_codes'] ?? null) ? $typePolicy['allowed_reason_codes'] : [];
        if (!empty($typeReasonCodes) && !in_array($reasonCode, $typeReasonCodes, true)) {
            throw new RuntimeException('Reason code is not permitted for this override type.');
        }

        if (!empty($typePolicy['approval_reference_required']) && $approvalReference === '') {
            throw new RuntimeException('Approval reference is required for this override type.');
        }

        $now = $this->now();
        $effectiveFrom = $this->parseTimestamp((string)($input['effective_from'] ?? ''), $now);
        $defaultExpiryHours = max(1, (int)($typePolicy['default_expiry_hours'] ?? 72));
        $maxExpiryHours = max($defaultExpiryHours, (int)($typePolicy['max_expiry_hours'] ?? 168));
        $expiresAt = $this->parseTimestamp((string)($input['expires_at'] ?? ''), $effectiveFrom->modify(sprintf('+%d hours', $defaultExpiryHours)));
        if ($expiresAt <= $effectiveFrom) {
            throw new RuntimeException('Operational override expiry must be later than its effective time.');
        }
        $maxExpiry = $effectiveFrom->modify(sprintf('+%d hours', $maxExpiryHours));
        if ($expiresAt > $maxExpiry) {
            throw new RuntimeException('Operational override expiry exceeds the maximum allowed window.');
        }

        $records = $this->readAll();
        foreach ($records as $record) {
            if (!is_array($record)) {
                continue;
            }
            if (($record['override_type'] ?? '') !== $overrideType) {
                continue;
            }
            if (($record['subject_type'] ?? '') !== $subjectType || ($record['subject_id'] ?? '') !== $subjectId) {
                continue;
            }
            if (($record['control_code'] ?? '') !== $controlCode) {
                continue;
            }
            if ($this->effectiveStatus($record, $now) === 'active') {
                throw new RuntimeException('An active override already exists for this controlled gate.');
            }
        }

        $signatureMeaning = function_exists('evidence_signature_meaning_normalize_strict')
            ? \evidence_signature_meaning_normalize_strict((string)($typePolicy['signature_meaning'] ?? 'approval'))
            : 'approval';
        $approvedAt = $this->formatTimestamp($now);
        $signaturePayload = [
            'override_type' => $overrideType,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'control_family' => $controlFamily,
            'control_code' => $controlCode,
            'reason_code' => $reasonCode,
            'reason_text' => $reasonText,
            'approved_by' => $approvedBy,
            'approved_role' => $approvedRole,
            'approved_at' => $approvedAt,
            'approval_reference' => $approvalReference !== '' ? $approvalReference : null,
        ];

        $record = [
            'override_id' => $this->uuid(),
            'override_type' => $overrideType,
            'override_status' => 'active',
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'control_family' => $controlFamily,
            'control_code' => $controlCode,
            'requested_by' => $requestedBy !== '' ? $requestedBy : $approvedBy,
            'requested_role' => $requestedRole !== '' ? $requestedRole : $approvedRole,
            'approved_by' => $approvedBy,
            'approved_role' => $approvedRole,
            'approved_at' => $approvedAt,
            'effective_from' => $this->formatTimestamp($effectiveFrom),
            'expires_at' => $this->formatTimestamp($expiresAt),
            'reason_code' => $reasonCode,
            'reason_label' => (string)($reasonCatalog[$reasonCode]['label'] ?? $reasonCode),
            'reason_text' => $reasonText,
            'approval_reference' => $approvalReference !== '' ? $approvalReference : null,
            'follow_up_status' => !empty($typePolicy['follow_up_required']) ? 'open' : 'not_required',
            'source_context' => is_array($input['source_context'] ?? null) ? $input['source_context'] : [],
            'e_signature' => [
                'type' => 'electronic_signature',
                'signature_meaning' => $signatureMeaning,
                'signature_status' => 'applied',
                'signed_by' => $approvedBy,
                'signed_role' => $approvedRole,
                'signed_at' => $approvedAt,
                'signature_attestation' => (string)($typePolicy['signature_attestation'] ?? 'Controlled override approved.'),
                'signature_hash' => hash('sha256', json_encode($signaturePayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: ''),
            ],
            'status_history' => [[
                'from' => '',
                'to' => 'active',
                'transition' => 'create',
                'timestamp' => $approvedAt,
                'user' => $approvedBy,
                'reason' => 'Override activated from approved creation.',
            ]],
            'created_at' => $approvedAt,
            'updated_at' => $approvedAt,
        ];

        $records[] = $record;
        $this->writeAll($records);

        return $this->decorateRecord($record, $now);
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<int, array<string, mixed>>
     */
    public function listOverrides(array $filters = []): array
    {
        $now = $this->now();
        $rows = [];
        foreach ($this->readAll() as $record) {
            if (!is_array($record)) {
                continue;
            }
            $decorated = $this->decorateRecord($record, $now);
            if ($this->matchesFilters($decorated, $filters)) {
                $rows[] = $decorated;
            }
        }

        usort($rows, static function (array $left, array $right): int {
            return strcmp((string)($right['approved_at'] ?? ''), (string)($left['approved_at'] ?? ''));
        });

        return $rows;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getOverride(string $overrideId): ?array
    {
        $needle = trim($overrideId);
        if ($needle === '') {
            return null;
        }

        $now = $this->now();
        foreach ($this->readAll() as $record) {
            if (!is_array($record)) {
                continue;
            }
            if ((string)($record['override_id'] ?? '') !== $needle) {
                continue;
            }

            return $this->decorateRecord($record, $now);
        }

        return null;
    }

    /**
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function transitionOverride(string $overrideId, string $transition, string $userId, array $context = []): array
    {
        $needle = trim($overrideId);
        $transition = strtolower(trim($transition));
        if ($needle === '') {
            throw new RuntimeException('Operational override id is required.');
        }
        if ($transition === '') {
            throw new RuntimeException('Operational override transition is required.');
        }

        $records = $this->readAll();
        $index = null;
        foreach ($records as $offset => $record) {
            if (!is_array($record)) {
                continue;
            }
            if ((string)($record['override_id'] ?? '') === $needle) {
                $index = $offset;
                break;
            }
        }

        if ($index === null) {
            throw new RuntimeException('Operational override not found.');
        }

        $record = (array)$records[$index];
        $now = $this->now();
        $currentStatus = $this->effectiveStatus($record, $now);
        $targetStatus = match ($transition) {
            'revoke' => 'revoked',
            'expire' => 'expired',
            'close' => 'closed',
            default => '',
        };
        if ($targetStatus === '') {
            throw new RuntimeException('Unsupported operational override transition.');
        }

        $allowed = [
            'active' => ['revoke', 'expire', 'close'],
            'expired' => ['close'],
            'revoked' => ['close'],
            'closed' => [],
        ];
        if (!in_array($transition, $allowed[$currentStatus] ?? [], true)) {
            throw new RuntimeException("Transition {$transition} is not allowed from {$currentStatus}.");
        }

        $reason = trim((string)($context['reason'] ?? $context['reason_text'] ?? ''));
        if ($reason === '') {
            throw new RuntimeException('Operational override transition requires a reason.');
        }

        $nowIso = $this->formatTimestamp($now);
        $record['override_status'] = $targetStatus;
        $record['updated_at'] = $nowIso;
        $record['updated_by'] = $userId;
        $record['last_transition_at'] = $nowIso;
        $record['last_transition_by'] = $userId;
        $record['status_history'] = is_array($record['status_history'] ?? null) ? $record['status_history'] : [];
        $record['status_history'][] = [
            'from' => $currentStatus,
            'to' => $targetStatus,
            'transition' => $transition,
            'timestamp' => $nowIso,
            'user' => $userId,
            'reason' => $reason,
        ];

        if ($targetStatus === 'revoked') {
            $record['revoked_at'] = $nowIso;
            $record['revoked_by'] = $userId;
            $record['revocation_reason'] = $reason;
        }
        if ($targetStatus === 'expired') {
            $record['expires_at'] = $nowIso;
            $record['expired_at'] = $nowIso;
            $record['expiry_reason'] = $reason;
        }
        if ($targetStatus === 'closed') {
            $record['closed_at'] = $nowIso;
            $record['closed_by'] = $userId;
            $record['closure_reason'] = $reason;
            if (($record['follow_up_status'] ?? 'not_required') !== 'not_required') {
                $record['follow_up_status'] = trim((string)($context['follow_up_status'] ?? '')) ?: 'closed';
            }
        }

        $records[$index] = $record;
        $this->writeAll($records);

        return $this->decorateRecord($record, $now);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function activeOverridesForSubject(string $subjectType, string $subjectId, ?string $controlFamily = null): array
    {
        $rows = $this->listOverrides([
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'current_status' => 'active',
        ]);

        if ($controlFamily === null || $controlFamily === '') {
            return $rows;
        }

        return array_values(array_filter($rows, static function (array $row) use ($controlFamily): bool {
            return (string)($row['control_family'] ?? '') === $controlFamily;
        }));
    }

    /**
     * @return array<string, mixed>
     */
    private function overrideTypePolicy(string $overrideType, array $policy): array
    {
        $types = is_array($policy['override_types'] ?? null) ? $policy['override_types'] : [];
        $typePolicy = $types[$overrideType] ?? null;
        if (!is_array($typePolicy)) {
            throw new RuntimeException('Unknown operational override type.');
        }

        return $typePolicy;
    }

    /**
     * @param array<string, mixed> $record
     * @param array<string, mixed> $filters
     */
    private function matchesFilters(array $record, array $filters): bool
    {
        foreach ($filters as $key => $value) {
            if ($value === null || $value === '') {
                continue;
            }
            if (($record[$key] ?? null) !== $value) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param array<string, mixed> $record
     * @return array<string, mixed>
     */
    private function decorateRecord(array $record, DateTimeImmutable $now): array
    {
        $record['current_status'] = $this->effectiveStatus($record, $now);
        $record['is_active'] = $record['current_status'] === 'active';
        return $record;
    }

    /**
     * @param array<string, mixed> $record
     */
    private function effectiveStatus(array $record, DateTimeImmutable $now): string
    {
        $status = trim((string)($record['override_status'] ?? 'active'));
        if (in_array($status, ['revoked', 'closed', 'expired'], true)) {
            return $status;
        }
        $expiresAt = $this->parseTimestamp((string)($record['expires_at'] ?? ''), $now);
        if ($expiresAt <= $now) {
            return 'expired';
        }
        return 'active';
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function readAll(): array
    {
        $loaded = $this->readJson($this->storePath);
        return is_array($loaded) ? array_values(array_filter($loaded, 'is_array')) : [];
    }

    /**
     * @param array<int, array<string, mixed>> $records
     */
    private function writeAll(array $records): void
    {
        $this->writeJson($this->storePath, array_values($records));
    }

    /**
     * @return array<string, mixed>|array<int, mixed>|null
     */
    private function readJson(string $path): array|null
    {
        if (!is_file($path)) {
            return null;
        }
        $raw = @file_get_contents($path);
        if ($raw === false || trim($raw) === '') {
            return null;
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : null;
    }

    /**
     * @param array<string, mixed>|array<int, mixed> $data
     */
    private function writeJson(string $path, array $data): void
    {
        $dir = dirname($path);
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new RuntimeException('Unable to initialize override storage.');
        }

        $tmp = $path . '.tmp.' . getmypid();
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new RuntimeException('Unable to encode override storage.');
        }
        if (@file_put_contents($tmp, $json . PHP_EOL, LOCK_EX) === false) {
            @unlink($tmp);
            throw new RuntimeException('Unable to persist override storage.');
        }
        if (!@rename($tmp, $path)) {
            @unlink($tmp);
            throw new RuntimeException('Unable to finalize override storage.');
        }
    }

    private function parseTimestamp(string $raw, DateTimeImmutable $default): DateTimeImmutable
    {
        $value = trim($raw);
        if ($value === '') {
            return $default;
        }
        $parsed = new DateTimeImmutable($value);
        return $parsed;
    }

    private function formatTimestamp(DateTimeImmutable $value): string
    {
        return $value->format('c');
    }

    private function now(): DateTimeImmutable
    {
        return new DateTimeImmutable('now', new \DateTimeZone('+07:00'));
    }

    private function uuid(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }
}
