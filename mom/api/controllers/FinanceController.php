<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\IdempotencyService;
use MOM\Api\Services\RecordConflictException;
use MOM\Services\FinanceControlService;
use Throwable;

final class FinanceController extends BaseController
{
    private ?FinanceControlService $financeControlService = null;
    private ?IdempotencyService $idempotencyService = null;

    private function controls(): FinanceControlService
    {
        if ($this->financeControlService === null) {
            $this->financeControlService = new FinanceControlService($this->dataDir);
        }

        return $this->financeControlService;
    }

    private function idempotency(): IdempotencyService
    {
        if ($this->idempotencyService === null) {
            $this->idempotencyService = new IdempotencyService($this->dataDir);
        }

        return $this->idempotencyService;
    }

    private function requireFinanceRead(array $user): void
    {
        $this->requireAnyPermission($user, ['finance.ap_ar_invoices.read']);
    }

    private function requireFinanceWrite(array $user): void
    {
        $this->requireAnyPermission($user, ['finance.ap_ar_invoices.create', 'finance.ap_ar_invoices.update']);
    }

    private function userId(array $user): string
    {
        return (string)($user['username'] ?? $user['user'] ?? 'unknown');
    }

    private function parseIdempotencyKey(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_scalar($value)) {
            $this->error('invalid_idempotency_key', 400);
        }

        $text = trim((string)$value);
        if ($text === '') {
            return null;
        }
        if (strlen($text) > 200 || preg_match('/^[A-Za-z0-9._:\-]+$/', $text) !== 1) {
            $this->error('invalid_idempotency_key', 400);
        }

        return $text;
    }

    /**
     * @param array<string, mixed> $body
     * @return array<string, mixed>
     */
    private function financeCreateIdempotency(string $resourceName, array $body, string $actorPartyId): array
    {
        $explicitKey = $this->parseIdempotencyKey($this->requestHeader('Idempotency-Key'))
            ?? $this->parseIdempotencyKey($this->query('idempotency_key'))
            ?? $this->parseIdempotencyKey($this->query('request_id'))
            ?? $this->parseIdempotencyKey($body['idempotency_key'] ?? null)
            ?? $this->parseIdempotencyKey($body['request_id'] ?? null);

        $fingerprint = [
            'resource' => $resourceName,
            'actor_party_id' => $actorPartyId,
            'body' => $body,
        ];

        if ($explicitKey !== null) {
            return [
                'scope_key' => implode('|', ['finance_control', $resourceName, $actorPartyId]),
                'key' => $explicitKey,
                'key_source' => 'header_or_body',
                'mode' => 'client_token',
                'kind' => 'create',
                'domain' => 'finance',
                'table' => $resourceName,
                'user_id' => $actorPartyId,
                'fingerprint' => $fingerprint,
            ];
        }

        return [
            'scope_key' => implode('|', ['finance_control', $resourceName, $actorPartyId]),
            'key' => 'drv-finance-' . $resourceName . '-create-' . hash('sha256', json_encode($fingerprint, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: ''),
            'key_source' => 'derived:payload_retry_window',
            'mode' => 'derived_payload_window',
            'kind' => 'create',
            'domain' => 'finance',
            'table' => $resourceName,
            'user_id' => $actorPartyId,
            'ttl_seconds' => $this->idempotency()->retryWindowSeconds(),
            'fingerprint' => $fingerprint,
        ];
    }

    public function listPeriodCloses(): never
    {
        $user = $this->requireAuth();
        $this->requireFinanceRead($user);

        try {
            $this->success(['period_closes' => $this->controls()->listPeriodCloses()]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('finance_period_close_list_failed', 500, $e->getMessage());
        }
    }

    public function getPeriodClose(): never
    {
        $user = $this->requireAuth();
        $this->requireFinanceRead($user);

        $periodCloseId = trim((string)($this->query('periodCloseId') ?? ''));
        if ($periodCloseId === '') {
            $this->error('missing_period_close_id', 400);
        }

        try {
            $periodClose = $this->controls()->getPeriodClose($periodCloseId);
            if ($periodClose === null) {
                $this->error('finance_period_close_not_found', 404);
            }

            $this->success(['period_close' => $periodClose]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('finance_period_close_detail_failed', 500, $e->getMessage());
        }
    }

    public function listBackdateExceptions(): never
    {
        $user = $this->requireAuth();
        $this->requireFinanceRead($user);

        try {
            $this->success(['backdate_exceptions' => $this->controls()->listBackdateExceptions()]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('finance_backdate_exception_list_failed', 500, $e->getMessage());
        }
    }

    public function getBackdateException(): never
    {
        $user = $this->requireAuth();
        $this->requireFinanceRead($user);

        $backdateExceptionId = trim((string)($this->query('backdateExceptionId') ?? ''));
        if ($backdateExceptionId === '') {
            $this->error('missing_backdate_exception_id', 400);
        }

        try {
            $backdateException = $this->controls()->getBackdateException($backdateExceptionId);
            if ($backdateException === null) {
                $this->error('finance_backdate_exception_not_found', 404);
            }

            $this->success(['backdate_exception' => $backdateException]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('finance_backdate_exception_detail_failed', 500, $e->getMessage());
        }
    }

    public function createBackdateException(): never
    {
        $user = $this->requireAuth();
        $this->requireFinanceWrite($user);
        $this->requireCsrf();

        try {
            $body = $this->jsonBody();
            $execution = $this->idempotency()->execute(
                $this->financeCreateIdempotency('backdate_exceptions', $body, $this->userId($user)),
                function () use ($body, $user): array {
                    $backdateException = $this->controls()->createBackdateException($body, $this->userId($user));
                    return [
                        'status_code' => 201,
                        'payload' => ['backdate_exception' => $backdateException],
                    ];
                }
            );
            $this->success((array)($execution['payload'] ?? []), (int)($execution['status_code'] ?? 201));
        } catch (RecordConflictException $e) {
            $this->error('finance_backdate_exception_idempotency_conflict', 409, $e->getMessage());
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('finance_backdate_exception_create_failed', 500, $e->getMessage());
        }
    }

    public function createPeriodClose(): never
    {
        $user = $this->requireAuth();
        $this->requireFinanceWrite($user);
        $this->requireCsrf();

        try {
            $body = $this->jsonBody();
            $execution = $this->idempotency()->execute(
                $this->financeCreateIdempotency('period_close_controls', $body, $this->userId($user)),
                function () use ($body, $user): array {
                    $periodClose = $this->controls()->createPeriodClose($body, $this->userId($user));
                    return [
                        'status_code' => 201,
                        'payload' => ['period_close' => $periodClose],
                    ];
                }
            );
            $this->success((array)($execution['payload'] ?? []), (int)($execution['status_code'] ?? 201));
        } catch (RecordConflictException $e) {
            $this->error('finance_period_close_idempotency_conflict', 409, $e->getMessage());
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('finance_period_close_create_failed', 500, $e->getMessage());
        }
    }

    public function listCreditMemos(): never
    {
        $user = $this->requireAuth();
        $this->requireFinanceRead($user);

        try {
            $this->success(['credit_memos' => $this->controls()->listCreditMemos()]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('finance_credit_memo_list_failed', 500, $e->getMessage());
        }
    }

    public function getCreditMemo(): never
    {
        $user = $this->requireAuth();
        $this->requireFinanceRead($user);

        $creditMemoId = trim((string)($this->query('creditMemoId') ?? ''));
        if ($creditMemoId === '') {
            $this->error('missing_credit_memo_id', 400);
        }

        try {
            $creditMemo = $this->controls()->getCreditMemo($creditMemoId);
            if ($creditMemo === null) {
                $this->error('finance_credit_memo_not_found', 404);
            }

            $this->success(['credit_memo' => $creditMemo]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('finance_credit_memo_detail_failed', 500, $e->getMessage());
        }
    }

    public function createCreditMemo(): never
    {
        $user = $this->requireAuth();
        $this->requireFinanceWrite($user);
        $this->requireCsrf();

        try {
            $body = $this->jsonBody();
            $execution = $this->idempotency()->execute(
                $this->financeCreateIdempotency('credit_memos', $body, $this->userId($user)),
                function () use ($body, $user): array {
                    $creditMemo = $this->controls()->createCreditMemo($body, $this->userId($user));
                    return [
                        'status_code' => 201,
                        'payload' => ['credit_memo' => $creditMemo],
                    ];
                }
            );
            $this->success((array)($execution['payload'] ?? []), (int)($execution['status_code'] ?? 201));
        } catch (RecordConflictException $e) {
            $this->error('finance_credit_memo_idempotency_conflict', 409, $e->getMessage());
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('finance_credit_memo_create_failed', 500, $e->getMessage());
        }
    }

    public function listDebitMemos(): never
    {
        $user = $this->requireAuth();
        $this->requireFinanceRead($user);

        try {
            $this->success(['debit_memos' => $this->controls()->listDebitMemos()]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('finance_debit_memo_list_failed', 500, $e->getMessage());
        }
    }

    public function getDebitMemo(): never
    {
        $user = $this->requireAuth();
        $this->requireFinanceRead($user);

        $debitMemoId = trim((string)($this->query('debitMemoId') ?? ''));
        if ($debitMemoId === '') {
            $this->error('missing_debit_memo_id', 400);
        }

        try {
            $debitMemo = $this->controls()->getDebitMemo($debitMemoId);
            if ($debitMemo === null) {
                $this->error('finance_debit_memo_not_found', 404);
            }

            $this->success(['debit_memo' => $debitMemo]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('finance_debit_memo_detail_failed', 500, $e->getMessage());
        }
    }

    public function createDebitMemo(): never
    {
        $user = $this->requireAuth();
        $this->requireFinanceWrite($user);
        $this->requireCsrf();

        try {
            $body = $this->jsonBody();
            $execution = $this->idempotency()->execute(
                $this->financeCreateIdempotency('debit_memos', $body, $this->userId($user)),
                function () use ($body, $user): array {
                    $debitMemo = $this->controls()->createDebitMemo($body, $this->userId($user));
                    return [
                        'status_code' => 201,
                        'payload' => ['debit_memo' => $debitMemo],
                    ];
                }
            );
            $this->success((array)($execution['payload'] ?? []), (int)($execution['status_code'] ?? 201));
        } catch (RecordConflictException $e) {
            $this->error('finance_debit_memo_idempotency_conflict', 409, $e->getMessage());
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('finance_debit_memo_create_failed', 500, $e->getMessage());
        }
    }
}
