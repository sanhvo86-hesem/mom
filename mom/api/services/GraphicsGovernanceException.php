<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use RuntimeException;

class GraphicsGovernanceException extends RuntimeException
{
    /**
     * @param array<int, array<string, mixed>> $errors
     * @param array<string, mixed> $extra
     */
    public function __construct(
        private readonly int $statusCode,
        string $errorCode,
        string $message,
        private readonly array $errors = [],
        private readonly array $extra = [],
    ) {
        parent::__construct($message, 0);
        $this->errorCode = $errorCode;
    }

    private readonly string $errorCode;

    public function statusCode(): int
    {
        return $this->statusCode;
    }

    public function errorCode(): string
    {
        return $this->errorCode;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function errors(): array
    {
        return $this->errors;
    }

    /**
     * @return array<string, mixed>
     */
    public function extra(): array
    {
        return $this->extra;
    }
}
