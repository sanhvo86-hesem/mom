<?php

declare(strict_types=1);

namespace MOM\Services;

use RuntimeException;

/**
 * Structured domain-command failure that can be rendered as RFC 9457 Problem
 * Details and safely replayed by the idempotency ledger.
 */
final class DomainCommandProblemException extends RuntimeException
{
    /** @var list<array<string, mixed>> */
    private array $violations;

    public function __construct(
        private string $problemCode,
        private int $statusCode,
        string $detail,
        private string $title = '',
        private bool $retryable = false,
        array $violations = [],
    ) {
        parent::__construct($detail);
        $this->violations = array_values(array_filter($violations, 'is_array'));
    }

    public function problemCode(): string
    {
        return $this->problemCode;
    }

    public function statusCode(): int
    {
        return $this->statusCode;
    }

    public function title(): string
    {
        return $this->title !== '' ? $this->title : ucwords(str_replace('_', ' ', $this->problemCode));
    }

    public function retryable(): bool
    {
        return $this->retryable;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function violations(): array
    {
        return $this->violations;
    }
}

if (!class_exists('MOM\\Api\\Services\\DomainCommandProblemException', false)) {
    class_alias(DomainCommandProblemException::class, 'MOM\\Api\\Services\\DomainCommandProblemException');
}
