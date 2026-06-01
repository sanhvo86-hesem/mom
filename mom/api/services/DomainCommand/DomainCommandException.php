<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

use RuntimeException;
use Throwable;

final class DomainCommandException extends RuntimeException
{
    /**
     * @param array<string,mixed> $details
     */
    public function __construct(
        public readonly string $problemCode,
        string $message,
        public readonly int $httpStatus = 409,
        public readonly array $details = [],
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, $httpStatus, $previous);
    }
}
