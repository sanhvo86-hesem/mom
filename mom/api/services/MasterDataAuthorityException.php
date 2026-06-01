<?php

declare(strict_types=1);

namespace MOM\Services;

use RuntimeException;

final class MasterDataAuthorityException extends RuntimeException
{
    /**
     * @param array<string, mixed> $context
     */
    public function __construct(
        private readonly string $codeName,
        string $message,
        private readonly array $context = [],
    ) {
        parent::__construct($message);
    }

    public function codeName(): string
    {
        return $this->codeName;
    }

    /**
     * @return array<string, mixed>
     */
    public function context(): array
    {
        return $this->context;
    }

    /**
     * @return array<string, mixed>
     */
    public function problemDetails(): array
    {
        return array_merge([
            'type' => 'https://hesemeng.com/problems/governed-master-data-postgres-authority-required',
            'title' => 'PostgreSQL master-data authority required',
            'status' => 409,
            'code' => $this->codeName,
            'detail' => $this->getMessage(),
        ], $this->context);
    }
}
