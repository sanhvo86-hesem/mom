<?php

declare(strict_types=1);

namespace MOM\Services;

use DateTimeImmutable;
use RuntimeException;

/**
 * First-class finance control objects for period close and memo corrections.
 *
 * These objects do not replace full ERP posting, but they make close/correction
 * governance explicit and auditable instead of leaving them implicit inside a
 * unified invoice record.
 */
final class FinanceControlService
{
    private string $dataDir;

    public function __construct(string $dataDir)
    {
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listPeriodCloses(): array
    {
        return array_map(fn(array $row): array => $this->decoratePeriodClose($row), $this->readCollection('period_closes'));
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getPeriodClose(string $periodCloseId): ?array
    {
        $row = $this->findById('period_closes', 'period_close_id', $periodCloseId);
        return $row === null ? null : $this->decoratePeriodClose($row);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function createPeriodClose(array $payload, string $userId): array
    {
        $periodCode = trim((string)($payload['period_code'] ?? ''));
        $ledgerScope = strtoupper(trim((string)($payload['ledger_scope'] ?? '')));
        $reasonText = trim((string)($payload['reason'] ?? ''));
        if (preg_match('/^\d{4}\-(0[1-9]|1[0-2])$/', $periodCode) !== 1) {
            throw new RuntimeException('Invalid period_code. Expected YYYY-MM.');
        }
        if (!in_array($ledgerScope, ['AP', 'AR', 'PLANT'], true)) {
            throw new RuntimeException('Invalid ledger_scope.');
        }
        if ($reasonText === '') {
            throw new RuntimeException('Period close requires a reason.');
        }

        $rows = $this->readCollection('period_closes');
        foreach ($rows as $row) {
            if (($row['period_code'] ?? '') === $periodCode && ($row['ledger_scope'] ?? '') === $ledgerScope) {
                throw new RuntimeException('A governed period close control already exists for this ledger scope and period.');
            }
        }

        $now = $this->nowIso();
        $row = [
            'period_close_id' => $this->uuid('PC'),
            'period_code' => $periodCode,
            'ledger_scope' => $ledgerScope,
            'close_status' => 'closed',
            'closed_by' => $userId,
            'closed_at' => $now,
            'reason' => $reasonText,
            'e_signature' => [
                'type' => 'electronic_signature',
                'signature_meaning' => function_exists('evidence_signature_meaning_normalize_strict')
                    ? \evidence_signature_meaning_normalize_strict('approval')
                    : 'approval',
                'signature_status' => 'applied',
                'signed_by' => $userId,
                'signed_at' => $now,
            ],
            'status_history' => [[
                'from' => '',
                'to' => 'closed',
                'transition' => 'create',
                'timestamp' => $now,
                'user' => $userId,
                'reason' => $reasonText,
            ]],
            'created_at' => $now,
            'updated_at' => $now,
        ];

        $rows[] = $row;
        $this->writeCollection('period_closes', $rows);
        return $this->decoratePeriodClose($row);
    }

    /**
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function transitionPeriodClose(string $periodCloseId, string $transition, string $userId, array $context = [], ?string $orgId = null): array
    {
        $transition = strtolower(trim($transition));
        if ($transition === '') {
            throw new RuntimeException('Period close transition is required.');
        }

        $rows = $this->readCollection('period_closes');
        $index = $this->findIndexById($rows, 'period_close_id', $periodCloseId);
        if ($index === null) {
            throw new RuntimeException('Period close not found.');
        }

        $row = (array)$rows[$index];

        // SECURITY: Verify org_id matches session if provided
        if ($orgId !== null && ($row['org_id'] ?? null) !== $orgId) {
            throw new RuntimeException('Period close access denied');
        }

        $currentStatus = trim((string)($row['close_status'] ?? 'closed'));
        $targetStatus = match ($transition) {
            'reopen' => 'reopened',
            'close' => 'closed',
            default => '',
        };
        if ($targetStatus === '') {
            throw new RuntimeException('Unsupported period close transition.');
        }

        $allowed = [
            'closed' => ['reopen'],
            'reopened' => ['close'],
        ];
        if (!in_array($transition, $allowed[$currentStatus] ?? [], true)) {
            throw new RuntimeException("Transition {$transition} is not allowed from {$currentStatus}.");
        }

        $reason = trim((string)($context['reason'] ?? ''));
        if ($reason === '') {
            throw new RuntimeException('Period close transition requires a reason.');
        }

        $now = $this->nowIso();
        $row['close_status'] = $targetStatus;
        $row['updated_at'] = $now;
        $row['updated_by'] = $userId;
        $row['status_history'] = is_array($row['status_history'] ?? null) ? $row['status_history'] : [];
        $row['status_history'][] = [
            'from' => $currentStatus,
            'to' => $targetStatus,
            'transition' => $transition,
            'timestamp' => $now,
            'user' => $userId,
            'reason' => $reason,
        ];

        if ($transition === 'reopen') {
            $row['reopened_by'] = $userId;
            $row['reopened_at'] = $now;
            $row['reopen_reason'] = $reason;
        } else {
            $row['closed_by'] = $userId;
            $row['closed_at'] = $now;
            $row['reason'] = $reason;
        }

        $rows[$index] = $row;
        $this->writeCollection('period_closes', $rows);
        return $this->decoratePeriodClose($row);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listBackdateExceptions(): array
    {
        return array_map(fn(array $row): array => $this->decorateBackdateException($row), $this->readCollection('backdate_exceptions'));
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getBackdateException(string $backdateExceptionId): ?array
    {
        $row = $this->findById('backdate_exceptions', 'backdate_exception_id', $backdateExceptionId);
        return $row === null ? null : $this->decorateBackdateException($row);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function createBackdateException(array $payload, string $userId): array
    {
        $ledgerScope = strtoupper(trim((string)($payload['ledger_scope'] ?? '')));
        $subjectType = trim((string)($payload['subject_type'] ?? ''));
        $subjectRef = trim((string)($payload['subject_ref'] ?? ''));
        $reasonCode = trim((string)($payload['reason_code'] ?? 'closed_period_adjustment'));
        $reasonText = trim((string)($payload['reason'] ?? ''));
        $approvalReference = trim((string)($payload['approval_reference'] ?? ''));
        $requestedPostingDate = $this->normalizeDate((string)($payload['requested_posting_date'] ?? ''), 'requested_posting_date');
        $originalEventAt = $this->normalizeIsoTimestamp((string)($payload['original_event_at'] ?? ''), 'original_event_at');
        $expiresAt = $this->normalizeIsoTimestamp((string)($payload['expires_at'] ?? ''), 'expires_at');

        if (!in_array($ledgerScope, ['AP', 'AR', 'PLANT', 'EXECUTION'], true)) {
            throw new RuntimeException('Invalid ledger_scope.');
        }
        if ($subjectType === '' || $subjectRef === '') {
            throw new RuntimeException('Backdate exception requires subject_type and subject_ref.');
        }
        if ($reasonText === '' || $approvalReference === '') {
            throw new RuntimeException('Backdate exception requires a reason and approval_reference.');
        }

        $now = new DateTimeImmutable('now', new \DateTimeZone('+07:00'));
        $expiry = new DateTimeImmutable($expiresAt);
        if ($expiry <= $now) {
            throw new RuntimeException('Backdate exception expiry must be in the future.');
        }

        $rows = $this->readCollection('backdate_exceptions');
        foreach ($rows as $row) {
            if (
                ($row['ledger_scope'] ?? '') === $ledgerScope
                && ($row['subject_type'] ?? '') === $subjectType
                && ($row['subject_ref'] ?? '') === $subjectRef
                && ($row['requested_posting_date'] ?? '') === $requestedPostingDate
                && ($row['exception_status'] ?? '') === 'approved'
                && strtotime((string)($row['expires_at'] ?? '')) > time()
            ) {
                throw new RuntimeException('An active backdate exception already exists for this subject and posting date.');
            }
        }

        $nowIso = $this->nowIso();
        $row = [
            'backdate_exception_id' => $this->uuid('BDX'),
            'exception_status' => 'approved',
            'ledger_scope' => $ledgerScope,
            'subject_type' => $subjectType,
            'subject_ref' => $subjectRef,
            'reason_code' => $reasonCode,
            'reason' => $reasonText,
            'approval_reference' => $approvalReference,
            'original_event_at' => $originalEventAt,
            'requested_posting_date' => $requestedPostingDate,
            'approved_period_code' => substr($requestedPostingDate, 0, 7),
            'approved_by' => $userId,
            'approved_at' => $nowIso,
            'expires_at' => $expiresAt,
            'e_signature' => [
                'type' => 'electronic_signature',
                'signature_meaning' => function_exists('evidence_signature_meaning_normalize_strict')
                    ? \evidence_signature_meaning_normalize_strict('approval')
                    : 'approval',
                'signature_status' => 'applied',
                'signed_by' => $userId,
                'signed_at' => $nowIso,
            ],
            'status_history' => [[
                'from' => '',
                'to' => 'approved',
                'transition' => 'create',
                'timestamp' => $nowIso,
                'user' => $userId,
                'reason' => $reasonText,
            ]],
            'created_at' => $nowIso,
            'updated_at' => $nowIso,
        ];

        $rows[] = $row;
        $this->writeCollection('backdate_exceptions', $rows);
        return $this->decorateBackdateException($row);
    }

    /**
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function transitionBackdateException(string $backdateExceptionId, string $transition, string $userId, array $context = []): array
    {
        $transition = strtolower(trim($transition));
        if ($transition === '') {
            throw new RuntimeException('Backdate exception transition is required.');
        }

        $rows = $this->readCollection('backdate_exceptions');
        $index = $this->findIndexById($rows, 'backdate_exception_id', $backdateExceptionId);
        if ($index === null) {
            throw new RuntimeException('Backdate exception not found.');
        }

        $row = (array)$rows[$index];
        $currentStatus = $this->effectiveBackdateStatus($row);
        $targetStatus = match ($transition) {
            'revoke' => 'revoked',
            'expire' => 'expired',
            'close' => 'closed',
            default => '',
        };
        if ($targetStatus === '') {
            throw new RuntimeException('Unsupported backdate exception transition.');
        }

        $allowed = [
            'approved' => ['revoke', 'expire', 'close'],
            'expired' => ['close'],
            'revoked' => ['close'],
            'closed' => [],
        ];
        if (!in_array($transition, $allowed[$currentStatus] ?? [], true)) {
            throw new RuntimeException("Transition {$transition} is not allowed from {$currentStatus}.");
        }

        $reason = trim((string)($context['reason'] ?? ''));
        if ($reason === '') {
            throw new RuntimeException('Backdate exception transition requires a reason.');
        }

        $now = $this->nowIso();
        $row['exception_status'] = $targetStatus;
        $row['updated_at'] = $now;
        $row['updated_by'] = $userId;
        $row['status_history'] = is_array($row['status_history'] ?? null) ? $row['status_history'] : [];
        $row['status_history'][] = [
            'from' => $currentStatus,
            'to' => $targetStatus,
            'transition' => $transition,
            'timestamp' => $now,
            'user' => $userId,
            'reason' => $reason,
        ];

        if ($transition === 'revoke') {
            $row['revoked_by'] = $userId;
            $row['revoked_at'] = $now;
            $row['revocation_reason'] = $reason;
        } elseif ($transition === 'expire') {
            $row['expires_at'] = $now;
            $row['expired_at'] = $now;
            $row['expiry_reason'] = $reason;
        } else {
            $row['closed_by'] = $userId;
            $row['closed_at'] = $now;
            $row['closure_reason'] = $reason;
        }

        $rows[$index] = $row;
        $this->writeCollection('backdate_exceptions', $rows);
        return $this->decorateBackdateException($row);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listCreditMemos(): array
    {
        return $this->readCollection('credit_memos');
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getCreditMemo(string $creditMemoId): ?array
    {
        return $this->findById('credit_memos', 'credit_memo_id', $creditMemoId);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function createCreditMemo(array $payload, string $userId): array
    {
        return $this->createMemo('credit', $payload, $userId);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listDebitMemos(): array
    {
        return $this->readCollection('debit_memos');
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getDebitMemo(string $debitMemoId): ?array
    {
        return $this->findById('debit_memos', 'debit_memo_id', $debitMemoId);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function createDebitMemo(array $payload, string $userId): array
    {
        return $this->createMemo('debit', $payload, $userId);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function createMemo(string $kind, array $payload, string $userId): array
    {
        $invoiceScope = strtoupper(trim((string)($payload['invoice_scope'] ?? '')));
        $originalInvoiceRef = trim((string)($payload['original_invoice_ref'] ?? ''));
        $reasonCode = trim((string)($payload['reason_code'] ?? 'manual_adjustment'));
        $reasonText = trim((string)($payload['reason'] ?? ''));
        $currencyCode = strtoupper(trim((string)($payload['currency_code'] ?? 'VND')));
        $amount = (float)($payload['amount'] ?? 0);
        $postingDate = $this->normalizeDate((string)($payload['posting_date'] ?? date('Y-m-d')), 'posting_date');
        $periodCode = substr($postingDate, 0, 7);
        $backdateExceptionId = trim((string)($payload['backdate_exception_id'] ?? ''));

        if (!in_array($invoiceScope, ['AP', 'AR'], true)) {
            throw new RuntimeException('Invalid invoice_scope.');
        }
        if ($originalInvoiceRef === '' || $reasonText === '' || $amount <= 0) {
            throw new RuntimeException('Memo requires original invoice reference, reason, and positive amount.');
        }

        return $this->withFinanceControlLock(function () use (
            $kind,
            $invoiceScope,
            $originalInvoiceRef,
            $reasonCode,
            $reasonText,
            $currencyCode,
            $amount,
            $postingDate,
            $periodCode,
            $backdateExceptionId,
            $userId
        ): array {
            $preConsumptionException = $backdateExceptionId !== ''
                ? $this->findById('backdate_exceptions', 'backdate_exception_id', $backdateExceptionId)
                : null;

            $backdateEvidence = $this->assertPostingAllowed(
                $invoiceScope,
                $postingDate,
                $kind . '_memo',
                $originalInvoiceRef,
                $userId,
                $backdateExceptionId
            );

            $collection = $kind === 'credit' ? 'credit_memos' : 'debit_memos';
            $idField = $kind === 'credit' ? 'credit_memo_id' : 'debit_memo_id';
            $now = $this->nowIso();
            $row = [
                $idField => $this->uuid(strtoupper(substr($kind, 0, 1)) . 'M'),
                'memo_type' => $kind,
                'memo_status' => 'approved',
                'invoice_scope' => $invoiceScope,
                'original_invoice_ref' => $originalInvoiceRef,
                'reason_code' => $reasonCode,
                'reason' => $reasonText,
                'amount' => round($amount, 2),
                'currency_code' => $currencyCode,
                'posting_date' => $postingDate,
                'period_code' => $periodCode,
                'backdate_exception_id' => $backdateEvidence['backdate_exception_id'] ?? '',
                'posting_control' => $backdateEvidence,
                'approved_by' => $userId,
                'approved_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            $rows = $this->readCollection($collection);
            $rows[] = $row;
            try {
                $this->writeCollection($collection, $rows);
            } catch (\Throwable $e) {
                if (($backdateEvidence['policy'] ?? '') === 'closed_period_backdate_exception_consumed' && is_array($preConsumptionException)) {
                    $this->restoreBackdateException($preConsumptionException);
                }
                throw $e;
            }

            return $row;
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function assertPostingAllowed(
        string $ledgerScope,
        string $postingDate,
        string $subjectType,
        string $subjectRef,
        string $userId,
        string $backdateExceptionId = ''
    ): array {
        $periodCode = substr($postingDate, 0, 7);
        $closedControl = null;
        foreach ($this->readCollection('period_closes') as $periodClose) {
            if (($periodClose['ledger_scope'] ?? '') !== $ledgerScope || ($periodClose['period_code'] ?? '') !== $periodCode) {
                continue;
            }
            if (($periodClose['close_status'] ?? 'closed') === 'closed') {
                $closedControl = $periodClose;
                break;
            }
        }

        if ($closedControl === null) {
            return [
                'policy' => 'period_open_or_uncontrolled',
                'ledger_scope' => $ledgerScope,
                'period_code' => $periodCode,
                'posting_date' => $postingDate,
            ];
        }

        if ($backdateExceptionId === '') {
            throw new RuntimeException("Posting period {$periodCode} for {$ledgerScope} is closed.");
        }

        $exceptions = $this->readCollection('backdate_exceptions');
        $index = $this->findIndexById($exceptions, 'backdate_exception_id', $backdateExceptionId);
        if ($index === null) {
            throw new RuntimeException('Backdate exception not found.');
        }

        $exception = (array)$exceptions[$index];
        if ($this->effectiveBackdateStatus($exception) !== 'approved') {
            throw new RuntimeException('Backdate exception is not approved or is no longer active.');
        }
        if (($exception['ledger_scope'] ?? '') !== $ledgerScope) {
            throw new RuntimeException('Backdate exception ledger_scope does not match posting scope.');
        }
        if (($exception['requested_posting_date'] ?? '') !== $postingDate) {
            throw new RuntimeException('Backdate exception posting date does not match.');
        }

        $exceptionSubjectRef = trim((string)($exception['subject_ref'] ?? ''));
        if ($exceptionSubjectRef !== $subjectRef) {
            throw new RuntimeException('Backdate exception subject does not match posting subject.');
        }

        $now = $this->nowIso();
        $exception['exception_status'] = 'closed';
        $exception['used_at'] = $now;
        $exception['used_by'] = $userId;
        $exception['used_for'] = [
            'subject_type' => $subjectType,
            'subject_ref' => $subjectRef,
            'posting_date' => $postingDate,
        ];
        $exception['updated_at'] = $now;
        $exception['updated_by'] = $userId;
        $exception['status_history'] = is_array($exception['status_history'] ?? null) ? $exception['status_history'] : [];
        $exception['status_history'][] = [
            'from' => 'approved',
            'to' => 'closed',
            'transition' => 'consume_for_posting',
            'timestamp' => $now,
            'user' => $userId,
            'reason' => "Consumed by {$subjectType} {$subjectRef}",
        ];
        $exceptions[$index] = $exception;
        $this->writeCollection('backdate_exceptions', $exceptions);

        return [
            'policy' => 'closed_period_backdate_exception_consumed',
            'ledger_scope' => $ledgerScope,
            'period_code' => $periodCode,
            'posting_date' => $postingDate,
            'period_close_id' => $closedControl['period_close_id'] ?? '',
            'backdate_exception_id' => $backdateExceptionId,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function readCollection(string $name): array
    {
        $path = $this->collectionPath($name);
        if (!is_file($path)) {
            return [];
        }
        $raw = @file_get_contents($path);
        if ($raw === false || trim($raw) === '') {
            return [];
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? array_values(array_filter($decoded, 'is_array')) : [];
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    private function writeCollection(string $name, array $rows): void
    {
        $path = $this->collectionPath($name);
        $dir = dirname($path);
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new RuntimeException('Unable to initialize finance control storage.');
        }
        $tmp = $path . '.tmp.' . getmypid();
        $json = json_encode(array_values($rows), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new RuntimeException('Unable to encode finance control storage.');
        }
        if (@file_put_contents($tmp, $json . PHP_EOL, LOCK_EX) === false) {
            @unlink($tmp);
            throw new RuntimeException('Unable to persist finance control storage.');
        }
        if (!@rename($tmp, $path)) {
            @unlink($tmp);
            throw new RuntimeException('Unable to finalize finance control storage.');
        }
    }

    /**
     * @template T
     * @param callable():T $operation
     * @return T
     */
    private function withFinanceControlLock(callable $operation): mixed
    {
        $dir = $this->dataDir . '/finance';
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new RuntimeException('Unable to initialize finance control storage.');
        }

        $handle = @fopen($dir . '/finance_control.lock', 'c');
        if ($handle === false) {
            throw new RuntimeException('Unable to open finance control lock.');
        }

        try {
            if (!@flock($handle, LOCK_EX)) {
                throw new RuntimeException('Unable to lock finance control authority.');
            }

            return $operation();
        } finally {
            @flock($handle, LOCK_UN);
            @fclose($handle);
        }
    }

    /**
     * @param array<string, mixed> $original
     */
    private function restoreBackdateException(array $original): void
    {
        $id = trim((string)($original['backdate_exception_id'] ?? ''));
        if ($id === '') {
            return;
        }

        $rows = $this->readCollection('backdate_exceptions');
        $index = $this->findIndexById($rows, 'backdate_exception_id', $id);
        if ($index === null) {
            $rows[] = $original;
        } else {
            $rows[$index] = $original;
        }
        $this->writeCollection('backdate_exceptions', $rows);
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function decoratePeriodClose(array $row): array
    {
        $row['current_status'] = trim((string)($row['close_status'] ?? 'closed')) ?: 'closed';
        return $row;
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function decorateBackdateException(array $row): array
    {
        $effectiveStatus = $this->effectiveBackdateStatus($row);
        if (($row['exception_status'] ?? null) !== $effectiveStatus) {
            $row['stored_exception_status'] = $row['exception_status'] ?? null;
            $row['exception_status'] = $effectiveStatus;
        }
        $row['current_status'] = $effectiveStatus;
        return $row;
    }

    /**
     * @param array<string, mixed> $row
     */
    private function effectiveBackdateStatus(array $row): string
    {
        $status = trim((string)($row['exception_status'] ?? 'approved')) ?: 'approved';
        if (in_array($status, ['revoked', 'expired', 'closed'], true)) {
            return $status;
        }

        $expiresAt = trim((string)($row['expires_at'] ?? ''));
        if ($status === 'approved' && $expiresAt !== '') {
            try {
                if ((new DateTimeImmutable($expiresAt)) <= new DateTimeImmutable('now', new \DateTimeZone('+07:00'))) {
                    return 'expired';
                }
            } catch (\Throwable) {
                return $status;
            }
        }

        return $status;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function findById(string $collection, string $idField, string $recordId): ?array
    {
        $needle = trim($recordId);
        if ($needle === '') {
            return null;
        }

        foreach ($this->readCollection($collection) as $row) {
            if (!is_array($row)) {
                continue;
            }
            if ((string)($row[$idField] ?? '') === $needle) {
                return $row;
            }
        }

        return null;
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    private function findIndexById(array $rows, string $idField, string $recordId): ?int
    {
        $needle = trim($recordId);
        if ($needle === '') {
            return null;
        }

        foreach ($rows as $index => $row) {
            if (!is_array($row)) {
                continue;
            }
            if ((string)($row[$idField] ?? '') === $needle) {
                return $index;
            }
        }

        return null;
    }

    private function collectionPath(string $name): string
    {
        return $this->dataDir . '/finance/' . $name . '.json';
    }

    private function normalizeDate(string $value, string $field): string
    {
        $trimmed = trim($value);
        if (preg_match('/^\d{4}\-(0[1-9]|1[0-2])\-(0[1-9]|[12]\d|3[01])$/', $trimmed) !== 1) {
            throw new RuntimeException("Invalid {$field}. Expected YYYY-MM-DD.");
        }

        return $trimmed;
    }

    private function normalizeIsoTimestamp(string $value, string $field): string
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            throw new RuntimeException("Missing {$field}.");
        }

        try {
            return (new DateTimeImmutable($trimmed))->format('c');
        } catch (\Throwable $e) {
            throw new RuntimeException("Invalid {$field}. Expected ISO-8601 timestamp.");
        }
    }

    private function nowIso(): string
    {
        return (new DateTimeImmutable('now', new \DateTimeZone('+07:00')))->format('c');
    }

    private function uuid(string $prefix): string
    {
        return $prefix . '-' . substr(bin2hex(random_bytes(6)), 0, 12);
    }
}
