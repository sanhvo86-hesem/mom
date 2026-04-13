<?php
declare(strict_types=1);

namespace MOM\Api\Services;

use RuntimeException;

final class WorkforceQualificationException extends RuntimeException
{
    /**
     * @param array<string, mixed> $details
     */
    public function __construct(
        private readonly string $reasonCode,
        private readonly array $details,
        string $message = 'Workforce qualification gate blocked execution.',
    ) {
        parent::__construct($message);
    }

    public function reasonCode(): string
    {
        return $this->reasonCode;
    }

    /**
     * @return array<string, mixed>
     */
    public function details(): array
    {
        return $this->details;
    }
}

if (!class_exists('MOM\\Services\\WorkforceQualificationException', false)) {
    class_alias(WorkforceQualificationException::class, 'MOM\\Services\\WorkforceQualificationException');
}
