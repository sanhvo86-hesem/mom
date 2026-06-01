<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use RuntimeException;
use Throwable;

final class EngineeringReleasePackageException extends RuntimeException
{
    /**
     * @param array<string,mixed> $details
     */
    public function __construct(
        private readonly string $reasonCode,
        private readonly array $details = [],
        string $message = 'Engineering release package command blocked.',
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, 409, $previous);
    }

    public function reasonCode(): string
    {
        return $this->reasonCode;
    }

    /**
     * @return array<string,mixed>
     */
    public function details(): array
    {
        return $this->details;
    }
}
